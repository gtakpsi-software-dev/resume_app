const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['interview', 'internship', 'research'],
    required: true,
  },
  company: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    default: null,
  },
  outcome: {
    type: String,
    enum: ['offered', 'rejected', 'withdrew', 'pending', ''],
    default: '',
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  companyLogo: {
    type: String,
    trim: true,
    default: '',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', ''],
    default: '',
  },
  interviewQuestions: {
    type: String,
    trim: true,
    default: '',
  },
  advice: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

experienceSchema.index({ user: 1, type: 1 });
experienceSchema.index({ company: 1 });

const Experience = mongoose.model('Experience', experienceSchema);

module.exports = Experience;
