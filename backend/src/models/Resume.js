const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  major: {
    type: String,
    required: true,
    trim: true
  },
  graduationYear: {
    type: String,
    required: true,
    trim: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  s3Key: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true,
    default: 'admin'
  },
  companies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  keywords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Keyword'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster searches
resumeSchema.index({ major: 1, graduationYear: 1 });
resumeSchema.index({ companies: 1 });
resumeSchema.index({ keywords: 1 });

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
