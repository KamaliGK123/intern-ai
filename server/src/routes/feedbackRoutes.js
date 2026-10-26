const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { getFeedbacks, getFeedback, createFeedback, approveFeedback } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getFeedbacks);
router.get('/:id', getFeedback);

router.post('/',
  authorize('admin', 'mentor'),
  [
    body('task').isMongoId().withMessage('Valid task ID required.'),
    body('intern').isMongoId().withMessage('Valid intern ID required.'),
    body('mentorNotes').trim().notEmpty().withMessage('Mentor notes are required.'),
  ],
  validate,
  createFeedback
);

router.put('/:id/approve', authorize('admin', 'mentor'), approveFeedback);

module.exports = router;
