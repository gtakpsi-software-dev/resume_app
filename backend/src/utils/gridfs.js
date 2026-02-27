const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

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

/**
 * Delete a file from GridFS.
 * Handles:
 * - Normal deletion
 * - "File not found" errors by cleaning up orphaned chunks
 * - Ensures fileId is a valid ObjectId
 * @param {import('mongodb').ObjectId | string} fileId
 */
function deleteFile(fileId) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();

    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(fileId);
    } catch (err) {
      console.error(`[GridFS] Invalid fileId provided for deletion: ${fileId}`, err);
      return reject(err);
    }

    const handleNotFoundCleanup = async () => {
      try {
        const result = await mongoose.connection.db
          .collection(`${BUCKET_NAME}.chunks`)
          .deleteMany({ files_id: objectId });

        console.warn(
          `[GridFS] File not found for ${objectId}. Cleaned up ${result.deletedCount} orphaned chunks.`
        );
        resolve();
      } catch (cleanupErr) {
        console.error(
          `[GridFS] Error cleaning up orphaned chunks for ${objectId}:`,
          cleanupErr
        );
        reject(cleanupErr);
      }
    };

    try {
      bucket.delete(objectId, async (err) => {
        if (!err) {
          console.log(`Successfully deleted GridFS file ${objectId}`);
          return resolve();
        }

        const isNotFound =
          err.code === 'ENOENT' ||
          (typeof err.message === 'string' && err.message.includes('File not found'));

        if (isNotFound) {
          return handleNotFoundCleanup();
        }

        console.error(`Error deleting GridFS file ${objectId}:`, err);
        return reject(err);
      });
    } catch (err) {
      const isNotFound =
        err.code === 'ENOENT' ||
        (typeof err.message === 'string' && err.message.includes('File not found'));

      if (isNotFound) {
        return handleNotFoundCleanup();
      }

      console.error(`[GridFS] Synchronous error while deleting file ${objectId}:`, err);
      return reject(err);
    }
  });
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

module.exports = {
  getBucket,
  uploadFile,
  deleteFile,
  streamFileToResponse,
  BUCKET_NAME,
};
