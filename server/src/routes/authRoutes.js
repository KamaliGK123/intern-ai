const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { login, getMe, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  login
);

router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password required.'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
  ],
  validate,
  changePassword
);

module.exports = router;
