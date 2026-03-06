const express = require('express');
const authRoutes = require('./authRoutes');
const resumeRoutes = require('./resumeRoutes');
const experienceRoutes = require('./experienceRoutes');

const router = express.Router();

// Mount route groups
router.use('/auth', authRoutes);
router.use('/resumes', resumeRoutes);
router.use('/experiences', experienceRoutes);

module.exports = router; 