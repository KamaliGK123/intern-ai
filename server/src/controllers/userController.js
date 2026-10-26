const User = require('../models/User');
const Task = require('../models/Task');
const ReviewMeeting = require('../models/ReviewMeeting');
const AuditLog = require('../models/AuditLog');

// GET /api/users — Admin only: get all users with pagination
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search, isActive } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .populate('assignedMentor', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      count: users.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      users,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('assignedMentor', 'name email department phone')
      .populate('assignedInterns', 'name email department');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// POST /api/users — Admin creates user
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, department, assignedMentor } = req.body;

    const user = await User.create({
      name, email, password, role, phone, department,
      assignedMentor: role === 'intern' ? assignedMentor : undefined,
    });

    // If intern is assigned to a mentor, update mentor's list
    if (role === 'intern' && assignedMentor) {
      await User.findByIdAndUpdate(assignedMentor, {
        $addToSet: { assignedInterns: user._id },
      });
    }

    await AuditLog.create({
      action: 'user.created',
      performedBy: req.user._id,
      targetUser: user._id,
      resourceType: 'User',
      resourceId: user._id,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'User created successfully.', user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id — Admin updates user
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, department, isActive, assignedMentor } = req.body;
    const updates = { name, email, phone, department, isActive };

    const existing = await User.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'User not found.' });

    // Handle mentor reassignment for interns
    if (existing.role === 'intern' && assignedMentor !== undefined) {
      // Remove from old mentor
      if (existing.assignedMentor) {
        await User.findByIdAndUpdate(existing.assignedMentor, {
          $pull: { assignedInterns: existing._id },
        });
      }
      // Add to new mentor
      if (assignedMentor) {
        await User.findByIdAndUpdate(assignedMentor, {
          $addToSet: { assignedInterns: existing._id },
        });
      }
      updates.assignedMentor = assignedMentor || null;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('assignedMentor', 'name email');

    await AuditLog.create({
      action: 'user.updated',
      performedBy: req.user._id,
      targetUser: user._id,
      resourceType: 'User',
      resourceId: user._id,
      changes: updates,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'User updated successfully.', user });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id — Soft delete (deactivate)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user._id.equals(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
    }

    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      action: 'user.deleted',
      performedBy: req.user._id,
      targetUser: user._id,
      resourceType: 'User',
      resourceId: user._id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'User deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/mentors — all active mentors
exports.getMentors = async (req, res, next) => {
  try {
    const mentors = await User.find({ role: 'mentor', isActive: true })
      .select('name email department assignedInterns phone')
      .populate('assignedInterns', 'name email');
    res.json({ success: true, mentors });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/interns — all active interns (admin/mentor)
exports.getInterns = async (req, res, next) => {
  try {
    let filter = { role: 'intern', isActive: true };
    if (req.user.role === 'mentor') {
      filter.assignedMentor = req.user._id;
    }
    const interns = await User.find(filter)
      .select('name email department assignedMentor phone createdAt')
      .populate('assignedMentor', 'name email');
    res.json({ success: true, interns });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id/stats — intern performance statistics
exports.getInternStats = async (req, res, next) => {
  try {
    const internId = req.params.id;
    // Security: interns can only view their own stats
    if (req.user.role === 'intern' && !req.user._id.equals(internId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const [tasks, meetings] = await Promise.all([
      Task.find({ intern: internId, isDeleted: false }),
      ReviewMeeting.find({ intern: internId }),
    ]);

    const stats = {
      totalTasks: tasks.length,
      assignedTasks: tasks.filter(t => t.status === 'assigned').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      submittedTasks: tasks.filter(t => t.status === 'submitted').length,
      approvedTasks: tasks.filter(t => t.status === 'approved').length,
      overdueTasks: tasks.filter(t => t.status === 'overdue').length,
      changesRequested: tasks.filter(t => t.status === 'changes-requested').length,
      totalMeetings: meetings.length,
      upcomingMeetings: meetings.filter(m => m.status === 'scheduled' && new Date(m.scheduledAt) > new Date()).length,
    };

    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};
