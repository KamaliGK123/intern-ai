const Project = require('../models/Project');
const Module = require('../models/Module');
const AuditLog = require('../models/AuditLog');

// ===== PROJECTS =====

exports.getProjects = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const projects = await Project.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: projects.length, projects });
  } catch (error) {
    next(error);
  }
};

exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('createdBy', 'name email');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    const modules = await Module.find({ project: project._id }).sort({ order: 1 });
    res.json({ success: true, project, modules });
  } catch (error) {
    next(error);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const { name, description, techStack, startDate, endDate } = req.body;
    const project = await Project.create({
      name, description, techStack, startDate, endDate,
      createdBy: req.user._id,
    });

    await AuditLog.create({
      action: 'project.created',
      performedBy: req.user._id,
      resourceType: 'Project',
      resourceId: project._id,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Project created.', project });
  } catch (error) {
    next(error);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const { name, description, techStack, status, startDate, endDate } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, techStack, status, startDate, endDate },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    await AuditLog.create({
      action: 'project.updated',
      performedBy: req.user._id,
      resourceType: 'Project',
      resourceId: project._id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Project updated.', project });
  } catch (error) {
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id, { status: 'archived' }, { new: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    res.json({ success: true, message: 'Project archived.' });
  } catch (error) {
    next(error);
  }
};

// ===== MODULES =====

exports.getModules = async (req, res, next) => {
  try {
    const { project } = req.query;
    const filter = {};
    if (project) filter.project = project;

    const modules = await Module.find(filter)
      .populate('project', 'name')
      .populate('createdBy', 'name')
      .sort({ order: 1, createdAt: 1 });

    res.json({ success: true, count: modules.length, modules });
  } catch (error) {
    next(error);
  }
};

exports.createModule = async (req, res, next) => {
  try {
    const { name, description, project, order } = req.body;
    const module = await Module.create({
      name, description, project, order,
      createdBy: req.user._id,
    });

    await AuditLog.create({
      action: 'module.created',
      performedBy: req.user._id,
      resourceType: 'Module',
      resourceId: module._id,
      ipAddress: req.ip,
    });

    const populated = await Module.findById(module._id).populate('project', 'name');
    res.status(201).json({ success: true, message: 'Module created.', module: populated });
  } catch (error) {
    next(error);
  }
};

exports.updateModule = async (req, res, next) => {
  try {
    const { name, description, order, status } = req.body;
    const module = await Module.findByIdAndUpdate(
      req.params.id,
      { name, description, order, status },
      { new: true, runValidators: true }
    ).populate('project', 'name');

    if (!module) return res.status(404).json({ success: false, message: 'Module not found.' });

    await AuditLog.create({
      action: 'module.updated',
      performedBy: req.user._id,
      resourceType: 'Module',
      resourceId: module._id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Module updated.', module });
  } catch (error) {
    next(error);
  }
};

exports.deleteModule = async (req, res, next) => {
  try {
    const module = await Module.findByIdAndUpdate(
      req.params.id, { status: 'archived' }, { new: true }
    );
    if (!module) return res.status(404).json({ success: false, message: 'Module not found.' });
    res.json({ success: true, message: 'Module archived.' });
  } catch (error) {
    next(error);
  }
};
