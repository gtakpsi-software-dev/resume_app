const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  createExperience,
  getMyExperiences,
  getAllExperiences,
  updateExperience,
  deleteExperience,
  toggleBookmark,
} = require('../controllers/experienceController');

const router = express.Router();

// All routes require member authentication
router.use(authenticate);

router.post('/', createExperience);
router.get('/', getMyExperiences);
router.get('/all', getAllExperiences);
router.put('/:id', updateExperience);
router.delete('/:id', deleteExperience);
router.post('/:id/bookmark', toggleBookmark);

module.exports = router;
