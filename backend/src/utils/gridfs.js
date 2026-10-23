const mongoose = require('mongoose');
const { GridFSBucket } = mongoose.mongo;

const BUCKET_NAME = 'resumes';

/**
 * Get the GridFS bucket for resume PDFs.
 * Uses default 'resumes' bucket (stores in fs.files / fs.chunks by default;
 * with bucket name 'resumes' uses resumes.files / resumes.chunks).
 */
function getBucket() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected. Ensure mongoose is connected before using GridFS.');
  }
  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

/**
 * Upload a file buffer to GridFS.
 * @param {Buffer} buffer - File content
 * @param {string} filename - Original filename (e.g. "resume.pdf")
 * @param {string} contentType - MIME type (e.g. "application/pdf")
 * @returns {Promise<{ fileId: import('mongodb').ObjectId, filename: string }>}
 */
function uploadFile(buffer, filename, contentType = 'application/pdf') {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const opts = {
      metadata: { contentType },
      contentType,
    };
    const uploadStream = bucket.openUploadStream(filename, opts);
    uploadStream.on('finish', () => {
      resolve({
        fileId: uploadStream.id,
        filename: uploadStream.filename,
      });
    });
    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });
}

async function deleteFile(fileId) {
  const objectId = new mongoose.Types.ObjectId(fileId);
  try {
    await getBucket().delete(objectId);
  } catch (err) {
    if (!String(err.message).includes('File not found')) throw err;
    await mongoose.connection.db
      .collection(`${BUCKET_NAME}.chunks`)
      .deleteMany({ files_id: objectId });
  }
}

/**
 * Stream a file from GridFS to the response.
 * @param {import('mongodb').ObjectId} fileId
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<boolean>} - true if file was found and streamed, false if not found
 */
function streamFileToResponse(fileId, res) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on('data', (chunk) => res.write(chunk));
    downloadStream.on('end', () => {
      res.end();
      resolve(true);
    });
    downloadStream.on('error', (err) => {
      if (err.code === 'ENOENT' || err.message && err.message.includes('File not found')) {
        res.status(404).end();
        resolve(false);
      } else {
        console.error('GridFS stream error:', err);
        if (!res.headersSent) res.status(500).end();
        reject(err);
      }
    });
  });
}

/**
 * Download a GridFS file into a Buffer.
 * @param {import('mongodb').ObjectId} fileId
 * @returns {Promise<Buffer>}
 */
function readFileToBuffer(fileId) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const chunks = [];
    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
    downloadStream.on('error', reject);
  });
}

module.exports = {
  getBucket,
  uploadFile,
  deleteFile,
  streamFileToResponse,
  readFileToBuffer,
  BUCKET_NAME,
};
