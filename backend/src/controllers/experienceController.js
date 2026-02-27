const Experience = require('../models/Experience');

// Create a new experience (interview, internship, or research)
const createExperience = async (req, res) => {
  try {
    const { type, company, role, startDate, endDate, outcome, description, companyLogo, rating, sentiment, interviewQuestions, advice } = req.body;
    const userId = req.user.id;

    if (!type || !company || !role || !startDate) {
      return res.status(400).json({
        error: true,
        message: 'Please provide type, company, role, and start date.',
      });
    }

    if (!['interview', 'internship', 'research'].includes(type)) {
      return res.status(400).json({
        error: true,
        message: 'Type must be interview, internship, or research.',
      });
    }

    const experience = new Experience({
      user: userId,
      type,
      company,
      role,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      outcome: outcome || '',
      description: description || '',
      companyLogo: companyLogo || '',
      rating: rating ? Math.min(5, Math.max(1, Number(rating))) : null,
      sentiment: sentiment || '',
      interviewQuestions: interviewQuestions || '',
      advice: advice || '',
    });

    await experience.save();

    res.status(201).json({
      error: false,
      message: 'Experience added successfully.',
      data: experience,
    });
  } catch (error) {
    console.error('Create experience error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to add experience.',
    });
  }
};

// Get all experiences for the current user
const getMyExperiences = async (req, res) => {
  try {
    const userId = req.user.id;

    const experiences = await Experience.find({ user: userId })
      .sort({ startDate: -1 })
      .lean();

    res.status(200).json({
      error: false,
      data: experiences,
    });
  } catch (error) {
    console.error('Get experiences error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch experiences.',
    });
  }
};

// Get all experiences from all members (shared view for dashboard)
const getAllExperiences = async (req, res) => {
  try {
    const experiences = await Experience.find()
      .sort({ startDate: -1 })
      .lean();

    res.status(200).json({
      error: false,
      data: experiences,
    });
  } catch (error) {
    console.error('Get all experiences error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch experiences.',
    });
  }
};

// Update an experience (only if owned by user)
const updateExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, company, role, startDate, endDate, outcome, description, companyLogo, rating, sentiment, interviewQuestions, advice } = req.body;
    const userId = req.user.id;

    const experience = await Experience.findOne({ _id: id, user: userId });
    if (!experience) {
      return res.status(404).json({
        error: true,
        message: 'Experience not found.',
      });
    }

    if (type) experience.type = type;
    if (company) experience.company = company;
    if (role) experience.role = role;
    if (startDate) experience.startDate = new Date(startDate);
    if (endDate !== undefined) experience.endDate = endDate ? new Date(endDate) : null;
    if (outcome !== undefined) experience.outcome = outcome || '';
    if (description !== undefined) experience.description = description || '';
    if (companyLogo !== undefined) experience.companyLogo = companyLogo || '';
    if (rating !== undefined) experience.rating = rating ? Math.min(5, Math.max(1, Number(rating))) : null;
    if (sentiment !== undefined) experience.sentiment = sentiment || '';
    if (interviewQuestions !== undefined) experience.interviewQuestions = interviewQuestions || '';
    if (advice !== undefined) experience.advice = advice || '';

    await experience.save();

    res.status(200).json({
      error: false,
      message: 'Experience updated successfully.',
      data: experience,
    });
  } catch (error) {
    console.error('Update experience error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update experience.',
    });
  }
};

// Delete an experience (only if owned by user)
const deleteExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const experience = await Experience.findOneAndDelete({ _id: id, user: userId });
    if (!experience) {
      return res.status(404).json({
        error: true,
        message: 'Experience not found.',
      });
    }

    res.status(200).json({
      error: false,
      message: 'Experience deleted successfully.',
    });
  } catch (error) {
    console.error('Delete experience error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete experience.',
    });
  }
};

module.exports = {
  createExperience,
  getMyExperiences,
  getAllExperiences,
  updateExperience,
  deleteExperience,
};
