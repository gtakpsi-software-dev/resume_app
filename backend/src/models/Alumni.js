const mongoose = require('mongoose');

const termYear = new mongoose.Schema(
  {
    year: Number,
    term: { type: String, enum: ['Spring', 'Summer', 'Fall', 'Winter', null] },
  },
  { _id: false }
);

const alumniSchema = new mongoose.Schema(
  {
    importKey: { type: String, required: true, unique: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'retired', 'deceased'], default: 'active' },
    industry: String,
    industryRaw: String,
    company: String,
    position: String,
    email: String,
    phone: String,
    linkedin: String,
    graduation: termYear,
    major: String,
    majorRaw: String,
    pledgeClass: termYear,
    chapterRoles: String,
    city: String,
    region: String,
    possibleDuplicate: { type: Boolean, default: false },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
  },
  { timestamps: true }
);

alumniSchema.index({ status: 1, name: 1 });

module.exports = mongoose.model('Alumni', alumniSchema);
