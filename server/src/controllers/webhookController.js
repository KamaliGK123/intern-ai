const Task = require('../models/Task');
const ReviewMeeting = require('../models/ReviewMeeting');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail, templates } = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * n8n webhook controller — receives triggers from n8n workflows.
 * All business logic (DB changes, auth) stays in Express backend.
 * n8n orchestrates timing and scheduling; we verify and execute here.
 */

// POST /api/webhooks/deadline-reminder
// Called by n8n Workflow B: checks approaching deadlines
exports.deadlineReminder = async (req, res, next) => {
  try {
    const { hours } = req.body; // 24 or 48
    const hoursNum = parseInt(hours) || 24;
    const now = new Date();
    const targetTime = new Date(now.getTime() + hoursNum * 60 * 60 * 1000);
    const windowStart = new Date(now.getTime() + (hoursNum - 1) * 60 * 60 * 1000);

    const reminderField = hoursNum === 48 ? 'reminderSent48h' : 'reminderSent24h';
    const notifType = hoursNum === 48 ? 'deadline-reminder-48h' : 'deadline-reminder-24h';

    // Find tasks approaching deadline in the window, not yet reminded
    const tasks = await Task.find({
      deadline: { $gte: windowStart, $lte: targetTime },
      status: { $in: ['assigned', 'in-progress'] },
      [reminderField]: { $ne: true },
      isDeleted: false,
    })
      .populate('intern', 'name email')
      .populate('mentor', 'name')
      .populate('project', 'name');

    let sent = 0;
    for (const task of tasks) {
      if (!task.intern?.email) continue;
      const dedupeKey = `${notifType}-${task._id}`;
      const exists = await Notification.findOne({ deduplicationKey: dedupeKey });
      if (exists) {
        await Task.findByIdAndUpdate(task._id, { [reminderField]: true });
        continue;
      }

      const notif = await Notification.create({
        recipient: task.intern._id,
        type: notifType,
        title: `Deadline in ${hoursNum}h — ${task.title}`,
        message: `Your task "${task.title}" is due in ${hoursNum} hours.`,
        relatedTask: task._id,
        deduplicationKey: dedupeKey,
      });

      const html = templates.deadlineReminder({
        internName: task.intern.name,
        taskTitle: task.title,
        deadline: task.deadline,
        hoursLeft: hoursNum,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      });

      await sendEmail({
        to: task.intern.email,
        subject: `⏰ Deadline in ${hoursNum} hours — ${task.title}`,
        html,
        notificationId: notif._id,
      });

      await Task.findByIdAndUpdate(task._id, { [reminderField]: true });
      sent++;
    }

    res.json({ success: true, message: `Deadline reminders sent: ${sent}`, processed: tasks.length });
  } catch (error) {
    next(error);
  }
};

// POST /api/webhooks/meeting-reminder
// Called by n8n Workflow C
exports.meetingReminder = async (req, res, next) => {
  try {
    const { hours } = req.body;
    const hoursNum = parseInt(hours) || 24;
    const now = new Date();
    const targetTime = new Date(now.getTime() + hoursNum * 60 * 60 * 1000);
    const windowStart = new Date(now.getTime() + (hoursNum - 1) * 60 * 60 * 1000);

    const reminderField = hoursNum === 1 ? 'reminderSent1h' : 'reminderSent24h';
    const notifType = hoursNum === 1 ? 'meeting-reminder-1h' : 'meeting-reminder-24h';

    const meetings = await ReviewMeeting.find({
      scheduledAt: { $gte: windowStart, $lte: targetTime },
      status: { $in: ['scheduled', 'rescheduled'] },
      [reminderField]: { $ne: true },
    })
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('task', 'title');

    let sent = 0;
    for (const meeting of meetings) {
      for (const participant of [meeting.intern, meeting.mentor]) {
        if (!participant?.email) continue;
        const dedupeKey = `${notifType}-${meeting._id}-${participant._id}`;
        const exists = await Notification.findOne({ deduplicationKey: dedupeKey });
        if (exists) continue;

        const notif = await Notification.create({
          recipient: participant._id,
          type: notifType,
          title: `Meeting in ${hoursNum}h — ${meeting.task?.title}`,
          message: `Your review meeting is in ${hoursNum} hour(s).`,
          relatedMeeting: meeting._id,
          deduplicationKey: dedupeKey,
        });

        const html = templates.meeting({
          recipientName: participant.name,
          internName: meeting.intern.name,
          mentorName: meeting.mentor.name,
          taskTitle: meeting.task?.title || 'Review Meeting',
          stage: meeting.reviewStage,
          scheduledAt: meeting.scheduledAt,
          duration: meeting.duration,
          meetingLink: meeting.meetingLink,
          timezone: meeting.timeZone,
          type: 'scheduled',
        });

        await sendEmail({
          to: participant.email,
          subject: `⏰ Meeting Reminder — ${hoursNum}h — ${meeting.task?.title}`,
          html,
          notificationId: notif._id,
        });
        sent++;
      }
      await ReviewMeeting.findByIdAndUpdate(meeting._id, { [reminderField]: true });
    }

    res.json({ success: true, message: `Meeting reminders sent: ${sent}` });
  } catch (error) {
    next(error);
  }
};

// POST /api/webhooks/mark-overdue
// Called by n8n Workflow B: marks overdue tasks
exports.markOverdueTasks = async (req, res, next) => {
  try {
    const now = new Date();
    const result = await Task.updateMany(
      {
        deadline: { $lt: now },
        status: { $in: ['assigned', 'in-progress'] },
        isDeleted: false,
      },
      { status: 'overdue' }
    );

    logger.info(`Marked ${result.modifiedCount} tasks as overdue`);

    // Send overdue notifications
    const overdueTasks = await Task.find({
      deadline: { $lt: now },
      status: 'overdue',
      overdueNotificationSent: { $ne: true },
      isDeleted: false,
    })
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('project', 'name');

    let notified = 0;
    for (const task of overdueTasks) {
      const dedupeKey = `task-overdue-${task._id}`;
      const exists = await Notification.findOne({ deduplicationKey: dedupeKey });
      if (!exists && task.intern?.email) {
        await Notification.create({
          recipient: task.intern._id,
          type: 'task-overdue',
          title: `Task Overdue — ${task.title}`,
          message: `Your task "${task.title}" is overdue. Please contact your mentor immediately.`,
          relatedTask: task._id,
          deduplicationKey: dedupeKey,
        });
        notified++;
      }
      await Task.findByIdAndUpdate(task._id, { overdueNotificationSent: true });
    }

    res.json({ success: true, marked: result.modifiedCount, notified });
  } catch (error) {
    next(error);
  }
};

// POST /api/webhooks/test
exports.testWebhook = async (req, res) => {
  res.json({ success: true, message: 'Webhook endpoint is working.', timestamp: new Date() });
};
