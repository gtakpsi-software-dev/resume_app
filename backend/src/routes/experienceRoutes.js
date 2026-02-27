const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  createExperience,
  getMyExperiences,
  getAllExperiences,
  updateExperience,
  deleteExperience,
} = require('../controllers/experienceController');

const router = express.Router();

// All routes require member authentication
router.use(authenticate);

router.post('/', createExperience);
router.get('/', getMyExperiences);
router.get('/all', getAllExperiences);
router.put('/:id', updateExperience);
router.delete('/:id', deleteExperience);

module.exports = router;
