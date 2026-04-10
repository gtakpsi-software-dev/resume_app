require('dotenv').config();
const mongoose = require('mongoose');
const pdfParse = require('pdf-parse');
const { Resume } = require('../models');
const { getBucket } = require('../utils/gridfs');

const extractContactInfo = (text) => {
  if (!text || typeof text !== 'string') {
    return { email: '', phone: '', linkedin: '' };
  }

  const normalizedText = text.replace(/\s+/g, ' ');

  const emailMatch = normalizedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0].trim() : '';

  const phoneMatch = normalizedText.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  const linkedinMatch = normalizedText.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-_%]+\/?/i
  );
  let linkedin = linkedinMatch ? linkedinMatch[0].trim() : '';
  if (linkedin && !/^https?:\/\//i.test(linkedin)) {
    linkedin = `https://${linkedin}`;
  }

  return { email, phone, linkedin };
};

const readGridFSFileAsBuffer = async (fileId) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const stream = getBucket().openDownloadStream(fileId);
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required in backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const resumes = await Resume.find({ isActive: true }).select('name fileId email phone linkedin').lean();
  let updatedCount = 0;

  for (const resume of resumes) {
    const hasAllContactInfo = resume.email && resume.phone && resume.linkedin;
    if (hasAllContactInfo || !resume.fileId) continue;

    try {
      const pdfBuffer = await readGridFSFileAsBuffer(resume.fileId);
      const parsed = await pdfParse(pdfBuffer);
      const contact = extractContactInfo(parsed.text || '');

      const updates = {};
      if (!resume.email && contact.email) updates.email = contact.email;
      if (!resume.phone && contact.phone) updates.phone = contact.phone;
      if (!resume.linkedin && contact.linkedin) updates.linkedin = contact.linkedin;

      if (Object.keys(updates).length > 0) {
        await Resume.updateOne({ _id: resume._id }, { $set: updates });
        updatedCount += 1;
        console.log(`Updated ${resume.name}:`, updates);
      }
    } catch (error) {
      console.error(`Failed to backfill ${resume.name}:`, error.message);
    }
  }

  console.log(`Backfill complete. Updated ${updatedCount} resumes.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Backfill failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
