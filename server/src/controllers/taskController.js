const Task = require('../models/Task');
const TaskSubmission = require('../models/TaskSubmission');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Project = require('../models/Project');
const Module = require('../models/Module');
const { generateTaskExplanation } = require('../utils/aiService');
const { sendEmail, templates } = require('../utils/emailService');
const logger = require('../utils/logger');

// Helper: emit a real-time event to a specific user room
const emitToUser = (req, userId, event, data) => {
  try {
    const io = req.app.get('io');
    if (io && userId) io.to(`user:${userId.toString()}`).emit(event, data);
  } catch (e) { /* socket emit is non-critical */ }
};


// GET /api/tasks
exports.getTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, priority, intern, mentor, project } = req.query;
    const filter = { isDeleted: false };

    // Enforce intern data isolation
    if (req.user.role === 'intern') {
      filter.intern = req.user._id;
    } else if (req.user.role === 'mentor') {
      filter.mentor = req.user._id;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (intern && req.user.role === 'admin') filter.intern = intern;
    if (mentor && req.user.role === 'admin') filter.mentor = mentor;
    if (project) filter.project = project;

    const total = await Task.countDocuments(filter);
    const tasks = await Task.find(filter)
      .populate('intern', 'name email department')
      .populate('mentor', 'name email')
      .populate('project', 'name')
      .populate('module', 'name')
      .sort({ deadline: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, count: tasks.length, total, page: Number(page), pages: Math.ceil(total / limit), tasks });
  } catch (error) {
    next(error);
  }
};

// GET /api/tasks/:id
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, isDeleted: false })
      .populate('intern', 'name email department')
      .populate('mentor', 'name email phone')
      .populate('project', 'name description')
      .populate('module', 'name description')
      .populate('aiExplanationApprovedBy', 'name');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Security: interns can only access their own tasks
    if (req.user.role === 'intern' && !task.intern._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (req.user.role === 'mentor' && !task.mentor._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks — Admin or Mentor creates task
exports.createTask = async (req, res, next) => {
  try {
    const {
      title, description, project, module: moduleId, intern, mentor,
      technologies, deadline, expectedDeliverables, acceptanceCriteria, priority,
    } = req.body;

    // Enforce mentor can only assign to their own interns
    if (req.user.role === 'mentor') {
      const internUser = await User.findById(intern);
      if (!internUser || !internUser.assignedMentor?.equals(req.user._id)) {
        return res.status(403).json({ success: false, message: 'You can only assign tasks to your own interns.' });
      }
    }

    const task = await Task.create({
      title, description, project, module: moduleId, intern,
      mentor: req.user.role === 'mentor' ? req.user._id : mentor,
      technologies, deadline, expectedDeliverables, acceptanceCriteria,
      priority: priority || 'medium',
      createdBy: req.user._id,
    });

    await AuditLog.create({
      action: 'task.created',
      performedBy: req.user._id,
      resourceType: 'Task',
      resourceId: task._id,
      ipAddress: req.ip,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('project', 'name')
      .populate('module', 'name');

    // Real-time: notify the assigned intern immediately
    emitToUser(req, intern, 'task:assigned', { task: populatedTask });
    // Real-time: refresh mentor's task list
    emitToUser(req, populatedTask.mentor?._id, 'task:created', { task: populatedTask });

    res.status(201).json({ success: true, message: 'Task created.', task: populatedTask });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks/:id/generate-explanation — AI generates explanation
exports.generateExplanation = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, isDeleted: false })
      .populate('intern', 'name')
      .populate('project', 'name')
      .populate('module', 'name')
      .populate('mentor', 'name');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const result = await generateTaskExplanation({
      title: task.title,
      description: task.description,
      projectName: task.project?.name || 'N/A',
      moduleName: task.module?.name || null,
      technologies: task.technologies,
      deadline: task.deadline.toLocaleDateString(),
      expectedDeliverables: task.expectedDeliverables,
      acceptanceCriteria: task.acceptanceCriteria,
      priority: task.priority,
      internName: task.intern?.name || 'the intern',
    });

    if (!result.success) {
      return res.status(503).json({ success: false, message: result.error });
    }

    task.aiExplanation = result.content;
    task.aiExplanationApproved = false;
    await task.save();

    await AuditLog.create({
      action: 'task.explanation-generated',
      performedBy: req.user._id,
      resourceType: 'Task',
      resourceId: task._id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'AI explanation generated.', aiExplanation: result.content });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tasks/:id/approve-explanation — Mentor approves (and optionally edits) AI explanation
exports.approveExplanation = async (req, res, next) => {
  try {
    const { aiExplanation } = req.body;
    const task = await Task.findOne({ _id: req.params.id, isDeleted: false })
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('project', 'name')
      .populate('module', 'name');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Update explanation if edited
    if (aiExplanation) task.aiExplanation = aiExplanation;
    task.aiExplanationApproved = true;
    task.aiExplanationApprovedBy = req.user._id;
    task.aiExplanationApprovedAt = new Date();
    await task.save();

    await AuditLog.create({
      action: 'task.explanation-approved',
      performedBy: req.user._id,
      resourceType: 'Task',
      resourceId: task._id,
      ipAddress: req.ip,
    });

    // Automatically send assignment email if not already sent
    if (!task.assignmentEmailSent) {
      await sendTaskAssignmentEmail(task);
    }

    // Real-time: push approved explanation to the intern
    emitToUser(req, task.intern?._id || task.intern, 'task:explanation-approved', {
      taskId: task._id,
      taskTitle: task.title,
      aiExplanation: task.aiExplanation,
    });

    res.json({ success: true, message: 'Explanation approved and assignment email sent.', task });
  } catch (error) {
    next(error);
  }
};

// Helper: send task assignment email
const sendTaskAssignmentEmail = async (task) => {
  try {
    const dedupeKey = `task-assigned-${task._id}`;
    const existing = await Notification.findOne({ deduplicationKey: dedupeKey });
    if (existing) return;

    const notif = await Notification.create({
      recipient: task.intern._id || task.intern,
      type: 'task-assigned',
      title: `New Task: ${task.title}`,
      message: `You have been assigned the task "${task.title}"`,
      relatedTask: task._id,
      deduplicationKey: dedupeKey,
    });

    const html = templates.taskAssignment({
      internName: task.intern.name,
      taskTitle: task.title,
      projectName: task.project?.name || 'N/A',
      moduleName: task.module?.name,
      description: task.description,
      technologies: task.technologies,
      deadline: task.deadline,
      deliverables: task.expectedDeliverables,
      mentorName: task.mentor?.name || 'Your Mentor',
      aiExplanation: task.aiExplanation,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
    });

    await sendEmail({
      to: task.intern.email,
      subject: `New Task Assigned — ${task.title}`,
      html,
      notificationId: notif._id,
    });

    await Task.findByIdAndUpdate(task._id, {
      assignmentEmailSent: true,
      assignmentEmailSentAt: new Date(),
    });
  } catch (err) {
    logger.error(`Failed to send task assignment email: ${err.message}`);
  }
};

// PUT /api/tasks/:id — Update task
exports.updateTask = async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'technologies', 'deadline', 'expectedDeliverables', 'acceptanceCriteria', 'priority', 'status'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      updates,
      { new: true, runValidators: true }
    ).populate('intern mentor project module', 'name email');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    await AuditLog.create({
      action: 'task.updated',
      performedBy: req.user._id,
      resourceType: 'Task',
      resourceId: task._id,
      changes: updates,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Task updated.', task });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tasks/:id/status — Change task status
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await Task.findOne({ _id: req.params.id, isDeleted: false })
      .populate('intern', 'name email')
      .populate('mentor', 'name email');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Validate role-based status transitions
    const internAllowed = ['in-progress'];
    const mentorAllowed = ['changes-requested', 'approved'];
    const adminAllowed = ['assigned', 'in-progress', 'submitted', 'changes-requested', 'approved', 'overdue'];

    if (req.user.role === 'intern') {
      if (!internAllowed.includes(status)) {
        return res.status(403).json({ success: false, message: `Interns can only set status to: ${internAllowed.join(', ')}` });
      }
      if (!task.intern._id.equals(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    } else if (req.user.role === 'mentor') {
      if (!mentorAllowed.includes(status)) {
        return res.status(403).json({ success: false, message: `Mentors can only set status to: ${mentorAllowed.join(', ')}` });
      }
    }

    const oldStatus = task.status;
    task.status = status;
    await task.save();

    await AuditLog.create({
      action: 'task.status-changed',
      performedBy: req.user._id,
      resourceType: 'Task',
      resourceId: task._id,
      changes: { from: oldStatus, to: status },
      ipAddress: req.ip,
    });

    // Real-time: notify both intern and mentor of status change
    const payload = { taskId: task._id, taskTitle: task.title, status, changedBy: req.user.name };
    emitToUser(req, task.intern._id, 'task:statusChanged', payload);
    emitToUser(req, task.mentor._id, 'task:statusChanged', payload);

    res.json({ success: true, message: `Task status updated to "${status}".`, task });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks/:id/submit — Intern submits task
exports.submitTask = async (req, res, next) => {
  try {
    const { submissionLink, notes } = req.body;
    const task = await Task.findOne({ _id: req.params.id, isDeleted: false, intern: req.user._id });

    if (!task) return res.status(404).json({ success: false, message: 'Task not found or not assigned to you.' });

    if (['approved'].includes(task.status)) {
      return res.status(400).json({ success: false, message: 'Task is already approved.' });
    }

    // Count previous submissions to set version
    const prevCount = await TaskSubmission.countDocuments({ task: task._id });
    const submission = await TaskSubmission.create({
      task: task._id,
      intern: req.user._id,
      submissionLink,
      notes,
      version: prevCount + 1,
    });

    task.status = 'submitted';
    await task.save();

    res.status(201).json({ success: true, message: 'Task submitted successfully.', submission });
  } catch (error) {
    next(error);
  }
};

// GET /api/tasks/:id/submissions
exports.getSubmissions = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, isDeleted: false });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Security check
    if (req.user.role === 'intern' && !task.intern.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const submissions = await TaskSubmission.find({ task: task._id })
      .populate('intern', 'name email')
      .sort({ version: -1 });

    res.json({ success: true, submissions });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tasks/:id — Admin soft deletes
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    await AuditLog.create({
      action: 'task.deleted',
      performedBy: req.user._id,
      resourceType: 'Task',
      resourceId: task._id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Task deleted.' });
  } catch (error) {
    next(error);
  }
};
