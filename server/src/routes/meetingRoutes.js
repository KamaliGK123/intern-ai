const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const {
  getMeetings, getMeeting, createMeeting,
  rescheduleMeeting, cancelMeeting, completeMeeting,
} = require('../controllers/meetingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getMeetings);
router.get('/:id', getMeeting);

router.post('/',
  authorize('admin', 'mentor'),
  [
    body('task').isMongoId().withMessage('Valid task ID required.'),
    body('intern').isMongoId().withMessage('Valid intern ID required.'),
    body('project').isMongoId().withMessage('Valid project ID required.'),
    body('reviewStage').isIn(['initial-discussion', 'first-review', 'second-review', 'final-review']).withMessage('Invalid review stage.'),
    body('scheduledAt').isISO8601().withMessage('Valid scheduled date/time required.'),
  ],
  validate,
  createMeeting
);

router.put('/:id/reschedule',
  authorize('admin', 'mentor'),
  [body('scheduledAt').isISO8601().withMessage('Valid scheduled date/time required.')],
  validate,
  rescheduleMeeting
);

router.put('/:id/cancel', authorize('admin', 'mentor'), cancelMeeting);
router.put('/:id/complete', authorize('admin', 'mentor'), completeMeeting);

module.exports = router;
