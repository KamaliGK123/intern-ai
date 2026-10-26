const Feedback = require('../models/Feedback');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { generateFeedback } = require('../utils/aiService');
const { sendEmail, templates } = require('../utils/emailService');
const logger = require('../utils/logger');

const emitToUser = (req, userId, event, data) => {
  try {
    const io = req.app.get('io');
    if (io && userId) io.to(`user:${userId.toString()}`).emit(event, data);
  } catch (e) {}
};


// GET /api/feedback — list feedback
exports.getFeedbacks = async (req, res, next) => {
  try {
    const { task, intern, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'intern') filter.intern = req.user._id;
    else if (req.user.role === 'mentor') filter.mentor = req.user._id;
    else {
      if (intern) filter.intern = intern;
    }

    if (task) filter.task = task;

    const total = await Feedback.countDocuments(filter);
    const feedbacks = await Feedback.find(filter)
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('task', 'title project')
      .populate('meeting', 'reviewStage scheduledAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, count: feedbacks.length, total, feedbacks });
  } catch (error) {
    next(error);
  }
};

// GET /api/feedback/:id
exports.getFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('task', 'title description acceptanceCriteria')
      .populate('meeting', 'reviewStage scheduledAt');

    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found.' });

    // Security: intern can only see their own feedback
    if (req.user.role === 'intern' && !feedback.intern._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (req.user.role === 'mentor' && !feedback.mentor._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, feedback });
  } catch (error) {
    next(error);
  }
};

// POST /api/feedback — Mentor creates feedback with AI generation
exports.createFeedback = async (req, res, next) => {
  try {
    const { task: taskId, intern, meeting, reviewStage, mentorNotes, overallRating } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Generate AI structured feedback
    const aiResult = await generateFeedback({
      mentorNotes,
      taskTitle: task.title,
      taskDescription: task.description,
      acceptanceCriteria: task.acceptanceCriteria,
      internName: null,
      reviewStage,
    });

    const feedback = await Feedback.create({
      task: taskId,
      intern,
      mentor: req.user._id,
      meeting,
      reviewStage,
      mentorNotes,
      aiStructuredFeedback: aiResult.success ? aiResult.content : {},
      aiRawResponse: aiResult.rawText || null,
      overallRating,
      isApproved: false,
    });

    await AuditLog.create({
      action: 'feedback.created',
      performedBy: req.user._id,
      resourceType: 'Feedback',
      resourceId: feedback._id,
      ipAddress: req.ip,
    });

    const populated = await Feedback.findById(feedback._id)
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('task', 'title');

    res.status(201).json({
      success: true,
      message: aiResult.success ? 'Feedback created with AI suggestions.' : 'Feedback created (AI unavailable).',
      feedback: populated,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/feedback/:id/approve — Mentor approves and sends feedback
exports.approveFeedback = async (req, res, next) => {
  try {
    const { aiStructuredFeedback } = req.body; // Allow mentor to edit AI content
    const feedback = await Feedback.findById(req.params.id)
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('task', 'title');

    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found.' });

    // Only the feedback creator or admin can approve
    if (req.user.role === 'mentor' && !feedback.mentor._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only approve your own feedback.' });
    }

    if (aiStructuredFeedback) feedback.aiStructuredFeedback = aiStructuredFeedback;
    feedback.isApproved = true;
    feedback.approvedBy = req.user._id;
    feedback.approvedAt = new Date();
    await feedback.save();

    // Send feedback email to intern
    if (!feedback.feedbackEmailSent) {
      await sendFeedbackEmail(feedback);
    }

    await AuditLog.create({
      action: 'feedback.approved',
      performedBy: req.user._id,
      resourceType: 'Feedback',
      resourceId: feedback._id,
      ipAddress: req.ip,
    });

    // Real-time: intern gets live notification that feedback is ready
    emitToUser(req, feedback.intern._id, 'feedback:approved', {
      feedbackId: feedback._id,
      taskTitle: feedback.task?.title,
      message: 'Your mentor has reviewed your work. Check your feedback!',
    });

    res.json({ success: true, message: 'Feedback approved and emailed to intern.', feedback });
  } catch (error) {
    next(error);
  }
};

// Helper: send feedback email
const sendFeedbackEmail = async (feedback) => {
  try {
    const dedupeKey = `feedback-approved-${feedback._id}`;
    const existing = await Notification.findOne({ deduplicationKey: dedupeKey });
    if (existing) return;

    const notif = await Notification.create({
      recipient: feedback.intern._id || feedback.intern,
      type: 'feedback-ready',
      title: `Feedback Ready — ${feedback.task?.title}`,
      message: `Your mentor has provided feedback on "${feedback.task?.title}"`,
      relatedFeedback: feedback._id,
      deduplicationKey: dedupeKey,
    });

    const html = templates.feedback({
      internName: feedback.intern.name,
      taskTitle: feedback.task?.title || 'Your Task',
      mentorName: feedback.mentor.name,
      reviewStage: feedback.reviewStage,
      aiStructuredFeedback: feedback.aiStructuredFeedback,
      rating: feedback.overallRating,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
    });

    await sendEmail({
      to: feedback.intern.email,
      subject: `Review Feedback — ${feedback.task?.title}`,
      html,
      notificationId: notif._id,
    });

    await Feedback.findByIdAndUpdate(feedback._id, {
      feedbackEmailSent: true,
      feedbackEmailSentAt: new Date(),
    });
  } catch (err) {
    logger.error(`Failed to send feedback email: ${err.message}`);
  }
};
