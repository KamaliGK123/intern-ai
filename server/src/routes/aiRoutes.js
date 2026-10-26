const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { chat } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

router.post('/chat',
  protect,
  authorize('intern'),
  [body('message').trim().notEmpty().withMessage('Message is required.')],
  validate,
  chat
);

module.exports = router;
