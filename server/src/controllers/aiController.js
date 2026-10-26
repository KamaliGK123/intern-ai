const { chatWithAssistant } = require('../utils/aiService');
const Task = require('../models/Task');
const ReviewMeeting = require('../models/ReviewMeeting');

// POST /api/ai/chat — Intern chat with AI assistant
exports.chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    // Fetch intern's context — only their own data
    const internId = req.user._id;
    const [tasks, upcomingMeetings] = await Promise.all([
      Task.find({ intern: internId, isDeleted: false })
        .populate('project', 'name')
        .populate('module', 'name')
        .populate('mentor', 'name')
        .limit(10),
      ReviewMeeting.find({
        intern: internId,
        status: { $in: ['scheduled', 'rescheduled'] },
        scheduledAt: { $gte: new Date() },
      }).limit(5),
    ]);

    const result = await chatWithAssistant(message, {
      internName: req.user.name,
      tasks,
      upcomingMeetings,
    });

    if (!result.success) {
      return res.status(503).json({ success: false, message: result.error || 'AI service unavailable.' });
    }

    res.json({ success: true, response: result.content });
  } catch (error) {
    next(error);
  }
};
