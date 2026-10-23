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
  vectorSearch,
  backfillResumeContacts,
} = require('../controllers/resumeController');
const { authenticate, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/search', authenticate, searchResumes);
router.get('/vector-search', authenticate, vectorSearch);
router.get('/filters', authenticate, getFilters);
router.get('/:id/file', authenticate, getResumeFile);
router.get('/:id', authenticate, getResumeById);

router.post('/', authenticate, upload.single('file'), uploadResume);
router.put('/:id', authenticate, updateResume);
router.delete('/:id', authenticate, deleteResume);
router.delete('/all/delete', authenticate, isAdmin, deleteAllResumes);
router.post('/backfill/contacts', authenticate, isAdmin, backfillResumeContacts);

module.exports = router; 