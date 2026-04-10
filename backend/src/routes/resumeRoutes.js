const express = require('express');
const {
  uploadResume,
  searchResumes,
  getResumeById,
  getResumeFile,
  updateResume,
  deleteResume,
  deleteAllResumes,
  getFilters,
  vectorSearch
} = require('../controllers/resumeController');
const { authenticate, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/search', searchResumes);
router.get('/vector-search', vectorSearch);
router.get('/filters', getFilters);
router.get('/:id/file', getResumeFile);  // must be before /:id
router.get('/:id', getResumeById);

// Protected routes
router.post('/', authenticate, upload.single('file'), uploadResume);
router.put('/:id', authenticate, updateResume);
router.delete('/:id', authenticate, deleteResume);
router.delete('/all/delete', authenticate, isAdmin, deleteAllResumes);

module.exports = router; 