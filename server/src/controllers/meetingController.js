const ReviewMeeting = require('../models/ReviewMeeting');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Task = require('../models/Task');
const { sendEmail, templates } = require('../utils/emailService');
const logger = require('../utils/logger');

const emitToUser = (req, userId, event, data) => {
  try {
    const io = req.app.get('io');
    if (io && userId) io.to(`user:${userId.toString()}`).emit(event, data);
  } catch (e) {}
};


// Helper: send meeting notification to both intern and mentor
const sendMeetingNotification = async (meeting, type = 'scheduled') => {
  try {
    const popMeeting = await ReviewMeeting.findById(meeting._id)
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('task', 'title')
      .populate('project', 'name');

    const data = {
      internName: popMeeting.intern.name,
      mentorName: popMeeting.mentor.name,
      taskTitle: popMeeting.task?.title || 'Task Review',
      stage: popMeeting.reviewStage,
      scheduledAt: popMeeting.scheduledAt,
      duration: popMeeting.duration,
      meetingLink: popMeeting.meetingLink,
      timezone: popMeeting.timeZone,
      type,
      cancelReason: popMeeting.cancelReason,
    };

    const typeLabel = type === 'cancelled' ? 'cancelled' : type === 'rescheduled' ? 'rescheduled' : 'scheduled';
    const subject = type === 'cancelled'
      ? `Meeting Cancelled — ${data.taskTitle}`
      : type === 'rescheduled'
      ? `Meeting Rescheduled — ${data.taskTitle}`
      : `Review Meeting Scheduled — ${data.taskTitle}`;

    const recipients = [
      { user: popMeeting.intern, name: popMeeting.intern.name },
      { user: popMeeting.mentor, name: popMeeting.mentor.name },
    ];

    for (const { user, name } of recipients) {
      const dedupeKey = `meeting-${typeLabel}-${meeting._id}-${user._id}`;
      const existing = await Notification.findOne({ deduplicationKey: dedupeKey });
      if (existing) continue;

      const notif = await Notification.create({
        recipient: user._id,
        type: type === 'cancelled' ? 'meeting-cancelled' : type === 'rescheduled' ? 'meeting-rescheduled' : 'meeting-scheduled',
        title: subject,
        message: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} meeting for: ${data.taskTitle}`,
        relatedMeeting: meeting._id,
        deduplicationKey: dedupeKey,
      });

      const html = templates.meeting({ ...data, recipientName: name });
      await sendEmail({ to: user.email, subject, html, notificationId: notif._id });
    }
  } catch (err) {
    logger.error(`Meeting notification failed: ${err.message}`);
  }
};

// GET /api/meetings
exports.getMeetings = async (req, res, next) => {
  try {
    const { status, intern, mentor, from, to } = req.query;
    const filter = {};

    if (req.user.role === 'intern') filter.intern = req.user._id;
    else if (req.user.role === 'mentor') filter.mentor = req.user._id;
    else {
      if (intern) filter.intern = intern;
      if (mentor) filter.mentor = mentor;
    }

    if (status) filter.status = status;
    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to) filter.scheduledAt.$lte = new Date(to);
    }

    const meetings = await ReviewMeeting.find(filter)
      .populate('intern', 'name email department')
      .populate('mentor', 'name email')
      .populate('task', 'title status')
      .populate('project', 'name')
      .populate('module', 'name')
      .sort({ scheduledAt: 1 });

    res.json({ success: true, count: meetings.length, meetings });
  } catch (error) {
    next(error);
  }
};

// GET /api/meetings/:id
exports.getMeeting = async (req, res, next) => {
  try {
    const meeting = await ReviewMeeting.findById(req.params.id)
      .populate('intern', 'name email department')
      .populate('mentor', 'name email')
      .populate('task', 'title status aiExplanation')
      .populate('project', 'name')
      .populate('module', 'name')
      .populate('createdBy', 'name');

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });

    // Security
    if (req.user.role === 'intern' && !meeting.intern._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (req.user.role === 'mentor' && !meeting.mentor._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, meeting });
  } catch (error) {
    next(error);
  }
};

// POST /api/meetings — Admin or Mentor schedules meeting
exports.createMeeting = async (req, res, next) => {
  try {
    const {
      title, task, intern, mentor, project, module: moduleId,
      reviewStage, scheduledAt, duration, timeZone, meetingLink, notes,
    } = req.body;

    // Validate date is in the future
    if (new Date(scheduledAt) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Meeting must be scheduled in the future.' });
    }

    // Prevent conflict (same intern/mentor, same time window)
    const endTime = new Date(new Date(scheduledAt).getTime() + (duration || 60) * 60000);
    const conflict = await ReviewMeeting.findOne({
      status: { $in: ['scheduled', 'rescheduled'] },
      $or: [{ intern }, { mentor }],
      scheduledAt: { $lt: endTime },
      $expr: {
        $gt: [
          { $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] },
          new Date(scheduledAt).getTime(),
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({ success: false, message: 'Time conflict with an existing meeting for this intern or mentor.' });
    }

    const meeting = await ReviewMeeting.create({
      title,
      task,
      intern,
      mentor: req.user.role === 'mentor' ? req.user._id : mentor,
      project,
      module: moduleId,
      reviewStage,
      scheduledAt,
      duration: duration || 60,
      timeZone: timeZone || 'Asia/Kolkata',
      meetingLink,
      notes,
      createdBy: req.user._id,
    });

    await AuditLog.create({
      action: 'meeting.scheduled',
      performedBy: req.user._id,
      resourceType: 'ReviewMeeting',
      resourceId: meeting._id,
      ipAddress: req.ip,
    });

    await sendMeetingNotification(meeting, 'scheduled');

    const populated = await ReviewMeeting.findById(meeting._id)
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('task', 'title')
      .populate('project', 'name');

    // Real-time: notify intern and mentor their calendar should refresh
    const meetingPayload = { meeting: populated };
    emitToUser(req, meeting.intern, 'meeting:scheduled', meetingPayload);
    emitToUser(req, meeting.mentor || req.user._id, 'meeting:scheduled', meetingPayload);

    res.status(201).json({ success: true, message: 'Meeting scheduled.', meeting: populated });
  } catch (error) {
    next(error);
  }
};

// PUT /api/meetings/:id/reschedule
exports.rescheduleMeeting = async (req, res, next) => {
  try {
    const { scheduledAt, meetingLink, notes, duration } = req.body;
    const meeting = await ReviewMeeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });
    if (meeting.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot reschedule a cancelled meeting.' });
    }

    if (new Date(scheduledAt) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Rescheduled time must be in the future.' });
    }

    meeting.rescheduledFrom = meeting._id;
    meeting.scheduledAt = scheduledAt;
    meeting.status = 'rescheduled';
    if (meetingLink) meeting.meetingLink = meetingLink;
    if (notes) meeting.notes = notes;
    if (duration) meeting.duration = duration;
    meeting.updateNotificationSent = false;
    await meeting.save();

    await AuditLog.create({
      action: 'meeting.rescheduled',
      performedBy: req.user._id,
      resourceType: 'ReviewMeeting',
      resourceId: meeting._id,
      changes: { scheduledAt },
      ipAddress: req.ip,
    });

    await sendMeetingNotification(meeting, 'rescheduled');

    const populated = await ReviewMeeting.findById(meeting._id)
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('task', 'title');

    res.json({ success: true, message: 'Meeting rescheduled.', meeting: populated });
  } catch (error) {
    next(error);
  }
};

// PUT /api/meetings/:id/cancel
exports.cancelMeeting = async (req, res, next) => {
  try {
    const { cancelReason } = req.body;
    const meeting = await ReviewMeeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });
    if (meeting.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Meeting is already cancelled.' });
    }

    meeting.status = 'cancelled';
    meeting.cancelReason = cancelReason;
    await meeting.save();

    await AuditLog.create({
      action: 'meeting.cancelled',
      performedBy: req.user._id,
      resourceType: 'ReviewMeeting',
      resourceId: meeting._id,
      changes: { cancelReason },
      ipAddress: req.ip,
    });

    await sendMeetingNotification(meeting, 'cancelled');

    res.json({ success: true, message: 'Meeting cancelled.' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/meetings/:id/complete
exports.completeMeeting = async (req, res, next) => {
  try {
    const meeting = await ReviewMeeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });

    meeting.status = 'completed';
    await meeting.save();
    res.json({ success: true, message: 'Meeting marked as completed.' });
  } catch (error) {
    next(error);
  }
};
