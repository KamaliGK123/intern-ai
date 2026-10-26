const Task = require('../models/Task');
const User = require('../models/User');
const ReviewMeeting = require('../models/ReviewMeeting');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');

// GET /api/dashboard/admin
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const [
      totalInterns,
      activeInterns,
      totalTasks,
      inProgressTasks,
      submittedTasks,
      overdueTasks,
      upcomingMeetings,
      recentTasks,
      pendingFeedbacks,
      totalMentors,
    ] = await Promise.all([
      User.countDocuments({ role: 'intern' }),
      User.countDocuments({ role: 'intern', isActive: true }),
      Task.countDocuments({ isDeleted: false }),
      Task.countDocuments({ status: 'in-progress', isDeleted: false }),
      Task.countDocuments({ status: 'submitted', isDeleted: false }),
      Task.countDocuments({ status: 'overdue', isDeleted: false }),
      ReviewMeeting.countDocuments({ status: { $in: ['scheduled', 'rescheduled'] }, scheduledAt: { $gte: now } }),
      Task.find({ isDeleted: false })
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate('intern', 'name email')
        .populate('mentor', 'name')
        .populate('project', 'name'),
      Feedback.countDocuments({ isApproved: false }),
      User.countDocuments({ role: 'mentor', isActive: true }),
    ]);

    // Intern table data
    const interns = await User.find({ role: 'intern', isActive: true })
      .select('name email department assignedMentor createdAt')
      .populate('assignedMentor', 'name')
      .limit(50);

    // Enrich interns with task stats
    const internIds = interns.map(i => i._id);
    const taskStats = await Task.aggregate([
      { $match: { intern: { $in: internIds }, isDeleted: false } },
      { $group: { _id: '$intern', total: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } } } },
    ]);
    const statsMap = {};
    taskStats.forEach(s => { statsMap[s._id.toString()] = s; });

    const enrichedInterns = interns.map(i => ({
      ...i.toObject(),
      taskStats: statsMap[i._id.toString()] || { total: 0, approved: 0 },
    }));

    res.json({
      success: true,
      stats: {
        totalInterns, activeInterns, totalMentors,
        totalTasks, inProgressTasks, submittedTasks,
        overdueTasks, upcomingMeetings, pendingFeedbacks,
        pendingReviews: submittedTasks,
      },
      recentTasks,
      interns: enrichedInterns,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/mentor
exports.getMentorDashboard = async (req, res, next) => {
  try {
    const mentorId = req.user._id;
    const now = new Date();

    const [
      myInterns,
      pendingReviews,
      upcomingMeetings,
      recentTasks,
      overdueTasks,
      pendingFeedbacks,
    ] = await Promise.all([
      User.countDocuments({ role: 'intern', assignedMentor: mentorId, isActive: true }),
      Task.countDocuments({ mentor: mentorId, status: 'submitted', isDeleted: false }),
      ReviewMeeting.find({ mentor: mentorId, status: { $in: ['scheduled', 'rescheduled'] }, scheduledAt: { $gte: now } })
        .populate('intern', 'name')
        .populate('task', 'title')
        .sort({ scheduledAt: 1 })
        .limit(5),
      Task.find({ mentor: mentorId, isDeleted: false })
        .populate('intern', 'name email')
        .populate('project', 'name')
        .sort({ updatedAt: -1 })
        .limit(10),
      Task.countDocuments({ mentor: mentorId, status: 'overdue', isDeleted: false }),
      Feedback.countDocuments({ mentor: mentorId, isApproved: false }),
    ]);

    res.json({
      success: true,
      stats: { myInterns, pendingReviews, upcomingMeetingsCount: upcomingMeetings.length, overdueTasks, pendingFeedbacks },
      upcomingMeetings,
      recentTasks,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/intern
exports.getInternDashboard = async (req, res, next) => {
  try {
    const internId = req.user._id;
    const now = new Date();

    const [tasks, meetings, feedbacks, notifications] = await Promise.all([
      Task.find({ intern: internId, isDeleted: false })
        .populate('mentor', 'name email phone')
        .populate('project', 'name')
        .populate('module', 'name')
        .sort({ deadline: 1 }),
      ReviewMeeting.find({ intern: internId, status: { $in: ['scheduled', 'rescheduled'] }, scheduledAt: { $gte: now } })
        .populate('mentor', 'name email')
        .populate('task', 'title')
        .sort({ scheduledAt: 1 })
        .limit(5),
      Feedback.find({ intern: internId, isApproved: true })
        .populate('mentor', 'name')
        .populate('task', 'title')
        .sort({ createdAt: -1 })
        .limit(5),
      Notification.find({ recipient: internId, isRead: false })
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const stats = {
      totalTasks: tasks.length,
      assignedTasks: tasks.filter(t => t.status === 'assigned').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      submittedTasks: tasks.filter(t => t.status === 'submitted').length,
      approvedTasks: tasks.filter(t => t.status === 'approved').length,
      overdueTasks: tasks.filter(t => t.status === 'overdue').length,
      upcomingMeetings: meetings.length,
      unreadNotifications: notifications.length,
    };

    res.json({ success: true, stats, tasks, upcomingMeetings: meetings, recentFeedback: feedbacks, notifications });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { recipient: req.user._id };
    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, notifications });
  } catch (error) {
    next(error);
  }
};

// PUT /api/dashboard/notifications/:id/read
exports.markNotificationRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/dashboard/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};
