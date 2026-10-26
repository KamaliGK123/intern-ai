const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getUsers, getUser, createUser, updateUser, deleteUser,
  getMentors, getInterns, getInternStats,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

// Mentor/Admin can list mentors and interns
router.get('/mentors', authorize('admin', 'mentor'), getMentors);
router.get('/interns', authorize('admin', 'mentor'), getInterns);
router.get('/:id/stats', getInternStats);

// Admin only full management
router.get('/', authorize('admin'), getUsers);
router.get('/:id', authorize('admin', 'mentor'), getUser);

router.post('/',
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('role').isIn(['admin', 'mentor', 'intern']).withMessage('Invalid role.'),
  ],
  validate,
  createUser
);

router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
