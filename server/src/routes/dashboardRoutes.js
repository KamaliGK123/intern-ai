const express = require('express');
const router = express.Router();
const {
  getAdminDashboard, getMentorDashboard, getInternDashboard,
  getNotifications, markNotificationRead, markAllRead,
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/admin', authorize('admin'), getAdminDashboard);
router.get('/mentor', authorize('mentor', 'admin'), getMentorDashboard);
router.get('/intern', authorize('intern'), getInternDashboard);

router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markAllRead);        // MUST be before /:id/read
router.put('/notifications/:id/read', markNotificationRead);


module.exports = router;
