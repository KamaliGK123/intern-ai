const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getModules, createModule, updateModule, deleteModule,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ─── Projects (mounted at /api/projects) ───
router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Project name required.'),
  body('description').trim().notEmpty().withMessage('Description required.'),
], validate, createProject);
router.put('/:id', authorize('admin'), updateProject);
router.delete('/:id', authorize('admin'), deleteProject);

// ─── Modules (mounted at /api/modules via same router instance) ───
// Note: To separate concerns, modules also export these handlers
router.get('/modules/list', getModules);

module.exports = router;
