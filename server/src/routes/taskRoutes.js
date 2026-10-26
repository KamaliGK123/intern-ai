const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getTasks, getTask, createTask, updateTask, updateTaskStatus,
  generateExplanation, approveExplanation, submitTask, getSubmissions, deleteTask,
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

router.get('/', getTasks);
router.get('/:id', getTask);
router.get('/:id/submissions', getSubmissions);

router.post('/',
  authorize('admin', 'mentor'),
  [
    body('title').trim().notEmpty().withMessage('Task title is required.'),
    body('description').trim().notEmpty().withMessage('Task description is required.'),
    body('project').isMongoId().withMessage('Valid project ID required.'),
    body('intern').isMongoId().withMessage('Valid intern ID required.'),
    body('deadline').isISO8601().withMessage('Valid deadline date required.'),
  ],
  validate,
  createTask
);

router.post('/:id/generate-explanation', authorize('admin', 'mentor'), generateExplanation);
router.put('/:id/approve-explanation', authorize('admin', 'mentor'), approveExplanation);
router.put('/:id/status',
  [body('status').notEmpty().withMessage('Status is required.')],
  validate,
  updateTaskStatus
);
router.put('/:id', authorize('admin', 'mentor'), updateTask);
router.post('/:id/submit', authorize('intern'), submitTask);
router.delete('/:id', authorize('admin'), deleteTask);

module.exports = router;
