const cron = require('node-cron');
const mongoose = require('mongoose');
const Resume = require('../models/Resume');
const { deleteFile: deleteFromGridFS } = require('../utils/gridfs');

// Run once a day at midnight server time
const SCHEDULE = '0 0 * * *';
//Testing purposes
// const SCHEDULE = '* * * * *';

function startCleanupJob() {
  if (!mongoose.connection.readyState) {
    console.warn('[CleanupJob] Mongoose is not connected. Cleanup job will still be scheduled, but may fail until connection is ready.');
  }

  const task = cron.schedule(SCHEDULE, async () => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    //Testing purposes
    // const cutoff = new Date(Date.now() - 1 * 60 * 1000); // 1 minute ago


    console.log(`[CleanupJob] Starting cleanup run at ${now.toISOString()}`);

    try {
      const candidates = await Resume.find({
        isActive: false,
        deletedAt: { $lte: cutoff },
      }).select('_id fileId name deletedAt');

      if (!candidates.length) {
        console.log('[CleanupJob] No resumes eligible for hard delete.');
        return;
      }

      console.log(`[CleanupJob] Found ${candidates.length} resumes eligible for hard delete.`);

      let successCount = 0;
      let failureCount = 0;

      for (const resume of candidates) {
        let fileDeleted = false;

        // 1. Try to delete the GridFS file in isolation
        if (resume.fileId) {
          try {
            await deleteFromGridFS(resume.fileId);
            fileDeleted = true;
          } catch (gridfsError) {
            failureCount += 1;
            console.error(
              `[CleanupJob] Failed to delete GridFS file for resume ${resume._id} (${resume.name || 'Unnamed'})`,
              gridfsError
            );
          }
        }

        // 2. Always attempt to delete the MongoDB document, regardless of GridFS outcome
        try {
          await Resume.findByIdAndDelete(resume._id);
          successCount += 1;
          console.log(
            `[CleanupJob] Permanently deleted resume ${resume._id} (${resume.name || 'Unnamed'}). File deleted: ${fileDeleted}.`
          );
        } catch (err) {
          failureCount += 1;
          console.error(
            `[CleanupJob] Failed to delete resume document ${resume._id} (${resume.name || 'Unnamed'})`,
            err
          );
        }
      }

      console.log(
        `[CleanupJob] Cleanup run complete. Permanently deleted ${successCount} resumes. Failures: ${failureCount}.`
      );
    } catch (err) {
      console.error('[CleanupJob] Error during cleanup run:', err);
    }
  });

  console.log('[CleanupJob] Scheduled daily resume cleanup job (midnight).');
  return task;
}

module.exports = {
  startCleanupJob,
};

