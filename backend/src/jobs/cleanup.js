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
        try {
          // 1. Isolate the GridFS deletion with its own try/catch
          if (resume.fileId) {
            try {
              await deleteFromGridFS(resume.fileId);
            } catch (gridfsError) {
              console.warn(
                `[CleanupJob] GridFS file missing for resume ${resume._id}. Proceeding to delete DB record.`
              );
            }
          }

          // 2. Safely delete the database document regardless of GridFS success
          await Resume.findByIdAndDelete(resume._id);
          successCount += 1;
          
        } catch (err) {
          failureCount += 1;
          console.error(
            `[CleanupJob] Failed to permanently delete resume ${resume._id} (${resume.name || 'Unnamed'})`,
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

