const mongoose = require('mongoose');
const { Resume } = require('../models');
const { generateEmbeddings } = require('../utils/voyageService');
const { streamFileToBuffer } = require('../utils/gridfs');
const pdfParse = require('pdf-parse');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI;

/**
 * Throttled script to generate embeddings for existing resumes.
 * Voyage AI free tier has a limit of 3 RPM.
 */
async function generateEmbeddingsForExisting() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');

        // Find all resumes that don't have embeddings or raw text
        const resumes = await Resume.find({
            $or: [
                { embedding: { $exists: false } },
                { embedding: { $size: 0 } },
                { rawText: { $exists: false } }
            ],
            isActive: true
        });

        console.log(`Found ${resumes.length} resumes to process.`);

        for (let i = 0; i < resumes.length; i++) {
            const resume = resumes[i];
            console.log(`[${i + 1}/${resumes.length}] Processing resume: ${resume.name} (${resume._id})`);

            try {
                let text = resume.rawText;

                // If no raw text, extract it from GridFS
                if (!text && resume.fileId) {
                    console.log(`  Extracting text from GridFS file: ${resume.fileId}`);
                    try {
                        const buffer = await streamFileToBuffer(resume.fileId);
                        const pdfData = await pdfParse(buffer);
                        text = pdfData.text;
                        resume.rawText = text;
                    } catch (pdfError) {
                        console.error(`  Error parsing PDF for ${resume.name}:`, pdfError.message);
                        continue;
                    }
                }

                if (text && text.trim() !== '') {
                    console.log('  Generating embeddings...');
                    const embeddings = await generateEmbeddings(text);
                    if (embeddings && embeddings.length > 0) {
                        resume.embedding = embeddings[0];
                        await resume.save();
                        console.log('  Successfully updated resume with embeddings.');
                    } else {
                        console.log('  No embeddings returned from Voyage AI.');
                    }
                } else {
                    console.log('  No text found for this resume.');
                }
            } catch (innerError) {
                console.error(`  Error processing resume ${resume.name}:`, innerError.message);
            }

            // Respect Voyage AI rate limits (3 RPM for free tier)
            if (i < resumes.length - 1) {
                console.log('  Waiting 40 seconds before next request to allow UI search capacity...');
                await new Promise(resolve => setTimeout(resolve, 40000));
            }
        }

        console.log('Processing complete.');
    } catch (error) {
        console.error('Error in migration script:', error);
    } finally {
        await mongoose.connection.close();
    }
}

generateEmbeddingsForExisting();
