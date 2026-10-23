const express = require('express');
const { listAlumni } = require('../controllers/alumniController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, listAlumni);

module.exports = router;
