const express = require('express');
const router = express.Router();
const { webhookAuth } = require('../middleware/auth');
const { deadlineReminder, meetingReminder, markOverdueTasks, testWebhook } = require('../controllers/webhookController');

// All webhook routes require the shared secret header
router.use(webhookAuth);

router.post('/deadline-reminder', deadlineReminder);
router.post('/meeting-reminder', meetingReminder);
router.post('/mark-overdue', markOverdueTasks);
router.get('/test', testWebhook);

module.exports = router;
