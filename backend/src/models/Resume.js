const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    major: {
      type: String,
      required: true,
      trim: true,
    },
    graduationYear: {
      type: String,
      required: true,
      trim: true,
    },
    /** GridFS file ID - references the PDF in MongoDB (resumes.files / resumes.chunks) */
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'resumes.files',
    },
    uploadedBy: {
      type: String,
      required: true,
      default: 'admin',
    },
    companies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
      },
    ],
    keywords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Keyword',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster searches
resumeSchema.index({ major: 1, graduationYear: 1 });
resumeSchema.index({ companies: 1 });
resumeSchema.index({ keywords: 1 });
resumeSchema.index({ isActive: 1, deletedAt: 1 });

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
