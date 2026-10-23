const express = require('express');
const authRoutes = require('./authRoutes');
const resumeRoutes = require('./resumeRoutes');
const experienceRoutes = require('./experienceRoutes');
const alumniRoutes = require('./alumniRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/resumes', resumeRoutes);
router.use('/experiences', experienceRoutes);
router.use('/alumni', alumniRoutes);

module.exports = router; 