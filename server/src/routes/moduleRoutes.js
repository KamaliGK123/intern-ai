const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { getModules, createModule, updateModule, deleteModule } = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getModules);
router.post('/', authorize('admin', 'mentor'), [
  body('name').trim().notEmpty().withMessage('Module name required.'),
  body('project').isMongoId().withMessage('Valid project ID required.'),
], validate, createModule);
router.put('/:id', authorize('admin', 'mentor'), updateModule);
router.delete('/:id', authorize('admin'), deleteModule);

module.exports = router;
