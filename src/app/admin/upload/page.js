"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { resumeAPI } from "@/lib/api";
import Link from "next/link";
import AdminWrapper from "@/components/ui/AdminWrapper";

export default function UploadPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBackfillingContacts, setIsBackfillingContacts] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [parsingStatus, setParsingStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(0);
  
  // Update the time estimation for Flash model
  useEffect(() => {
    if (files.length > 0) {
      // Calculate based on batches of 3 with 10s delays between batches
      // Each file takes roughly 6s to process + 1s delay between files
      const BATCH_SIZE = 10;
      const SECONDS_PER_FILE = 6;
      const DELAY_BETWEEN_FILES = 1;
      const DELAY_BETWEEN_BATCHES = 10;
      
      const numBatches = Math.ceil(files.length / BATCH_SIZE);
      const batchDelays = numBatches > 1 ? (numBatches - 1) * DELAY_BETWEEN_BATCHES : 0;
      const fileProcessingTime = files.length * SECONDS_PER_FILE;
      const fileDelays = files.length > 1 ? (files.length - 1) * DELAY_BETWEEN_FILES : 0;
      
      const totalEstimatedSeconds = fileProcessingTime + fileDelays + batchDelays;
      setEstimatedTime(totalEstimatedSeconds);
    } else {
      setEstimatedTime(0);
    }
  }, [files.length]);
  
  // Format time from seconds to minutes and seconds
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ${remainingSeconds > 0 ? `and ${remainingSeconds} seconds` : ""}`;
  };
  
  // Redirect if not admin
  if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
    router.push("/auth/login");
    return null;
  }
  
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Validate file types (PDF only)
    const invalidFiles = selectedFiles.filter(file => file.type !== "application/pdf");
    
    if (invalidFiles.length > 0) {
      setError(`${invalidFiles.length} file(s) are not PDFs and were removed.`);
      const validFiles = selectedFiles.filter(file => file.type === "application/pdf");
      setFiles(validFiles);
      return;
    }
    
    setFiles(selectedFiles);
    setError("");
  };
  
  const processBatch = async (fileBatch, startIndex) => {
    let batchSuccessCount = 0;
    let batchFailedCount = 0;
    let errorMessages = [];
    
    for (let i = 0; i < fileBatch.length; i++) {
      const fileIndex = startIndex + i;
      const file = fileBatch[i];
      
      setParsingStatus(`Processing file ${fileIndex + 1} of ${files.length}: ${file.name}`);
      setUploadProgress(prev => ({ ...prev, current: fileIndex + 1 }));
      
      try {
        await resumeAPI.create({}, file);
        batchSuccessCount++;
        setUploadProgress(prev => ({ ...prev, success: prev.success + 1 }));
      } catch (err) {
        // Get error details 
        let errorMessage = `${file.name}: ${err.message || "Unknown error"}`;
        let errorDetails = "";
        
        // If there&apos;s a server response with more details
        if (err.response) {
          if (err.response.data && err.response.data.message) {
            errorMessage = `${file.name}: ${err.response.data.message}`;
          }
          
          // Include status code
          errorDetails = `Status: ${err.response.status} ${err.response.statusText}`;
          
          // Debug log for diagnosing issues
          console.error("Full error response:", {
            file: file.name,
            status: err.response.status,
            statusText: err.response.statusText,
            headers: err.response.headers,
            data: err.response.data
          });
        }
        
        console.error(`Failed to upload file ${file.name}:`, err);
        errorMessages.push({ message: errorMessage, details: errorDetails, file: file.name });
        batchFailedCount++;
        setUploadProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
      }
      
      // Add shorter delay between individual files in batch (1 second)
      if (i < fileBatch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return { batchSuccessCount, batchFailedCount, errorMessages };
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setParsingStatus("");
    
    // Validate form
    if (files.length === 0) {
      setError("Please select at least one PDF file to upload.");
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress({ current: 0, total: files.length, success: 0, failed: 0 });
    
    // Process files in batches of 3 with shorter delays between batches
    const BATCH_SIZE = 3;
    const BATCH_DELAY = 10000; // 10 seconds
    let totalSuccessCount = 0;
    let totalFailedCount = 0;
    let allErrorMessages = [];
    
    for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
      // Create a batch of files
      const currentBatch = files.slice(batchStart, batchStart + BATCH_SIZE);
      
      // If this isn&apos;t the first batch, wait between batches
      if (batchStart > 0) {
        setParsingStatus(`Brief pause before processing next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
      
      setParsingStatus(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} of ${Math.ceil(files.length / BATCH_SIZE)}`);
      
      // Process the current batch
      const { batchSuccessCount, batchFailedCount, errorMessages } = await processBatch(currentBatch, batchStart);
      
      totalSuccessCount += batchSuccessCount;
      totalFailedCount += batchFailedCount;
      allErrorMessages = [...allErrorMessages, ...errorMessages];
    }
    
    // Show final results
    if (totalFailedCount === 0) {
      setSuccess(`Successfully uploaded all ${files.length} resume(s).`);
    } else if (totalSuccessCount > 0) {
      setSuccess(`Uploaded ${totalSuccessCount} resume(s) successfully.`);
      // Show details for failed uploads
      if (allErrorMessages.length > 0) {
        // Format the error message for display
        const formatErrorMessages = () => {
          if (allErrorMessages.length <= 5) {
            return allErrorMessages.map(err => 
              `${err.message}${err.details ? `\n   (${err.details})` : ""}`
            ).join("\n\n");
          } else {
            // If more than 5 errors, show first 5 and count the rest
            const firstFive = allErrorMessages.slice(0, 5).map(err => 
              `${err.message}${err.details ? `\n   (${err.details})` : ""}`
            ).join("\n\n");
            return `${firstFive}\n\n...and ${allErrorMessages.length - 5} more errors`;
          }
        };
        
        setError(`${totalFailedCount} resumes failed to upload.\n\n${formatErrorMessages()}`);
      } else {
        setError(`${totalFailedCount} resumes failed to upload.`);
      }
    } else {
      setError("Failed to upload any resumes. Please try again.");
    }
    
    // Reset file input
    setFiles([]);
    const fileInput = document.getElementById("pdfFiles");
    if (fileInput) fileInput.value = "";
    
    setIsSubmitting(false);
    setParsingStatus("");
  };
  
  const handleDeleteAll = async () => {
    setIsDeleting(true);
    setError("");
    setSuccess("");
    
    try {
      await resumeAPI.deleteAll();
      setSuccess("All resumes have been successfully deleted.");
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Error deleting all resumes:", err);
      setError("Failed to delete all resumes. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackfillContacts = async () => {
    setIsBackfillingContacts(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await resumeAPI.backfillContacts();
      const stats = data?.data || {};
      setSuccess(
        `Contact refresh finished. Scanned ${stats.scanned || 0}, updated ${stats.updated || 0}, skipped ${stats.skipped || 0}, failed ${stats.failed || 0}.`
      );
    } catch (err) {
      console.error("Error refreshing resume contacts:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to refresh contact info. Please try again."
      );
    } finally {
      setIsBackfillingContacts(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <Link href="/" className="text-indigo-600 hover:text-indigo-900">
            &larr; Back to Home
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBackfillContacts}
              disabled={isBackfillingContacts}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {isBackfillingContacts ? "Refreshing..." : "Refresh Contact Info"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Delete All Resumes
            </button>
          </div>
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-8">
          Batch Upload Resumes
        </h1>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6 p-4">
          <p className="text-gray-700">
            <strong>How it works:</strong> Upload multiple resume PDFs at once. The system will automatically extract the name, major, graduation year, companies, and skills from each PDF.
          </p>
        </div>
        
        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-red-700 whitespace-pre-line">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-4 rounded-md bg-green-50 p-4 text-green-700">
            {success}
          </div>
        )}
        
        {parsingStatus && (
          <div className="mt-4 rounded-md bg-blue-50 p-4 text-blue-700">
            <div className="flex items-center mb-2">
              <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              {parsingStatus}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              ></div>
            </div>
            <div className="mt-2 text-sm">
              {uploadProgress.current} of {uploadProgress.total} processed 
              ({uploadProgress.success} successful, {uploadProgress.failed} failed)
            </div>
          </div>
        )}
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="pdfFiles" className="block text-sm font-medium text-gray-700">
                    Resume PDFs <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="pdfFiles"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          <span>Select files</span>
                          <input
                            id="pdfFiles"
                            name="pdfFiles"
                            type="file"
                            multiple
                            accept="application/pdf"
                            className="sr-only"
                            onChange={handleFileChange}
                            required
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PDF files only</p>
                    </div>
                  </div>
                  
                  {files.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files ({files.length})</h4>
                      <ul className="border border-gray-200 rounded-md divide-y divide-gray-200 max-h-40 overflow-y-auto">
                        {files.map((file, index) => (
                          <li key={index} className="pl-3 pr-4 py-2 flex items-center justify-between text-sm">
                            <div className="w-0 flex-1 flex items-center">
                              <svg className="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                              <span className="ml-2 flex-1 w-0 truncate text-gray-900">{file.name}</span>
                            </div>
                            <div className="ml-4 flex-shrink-0 text-gray-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => {
                          setFiles([]);
                          document.getElementById("pdfFiles").value = "";
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-900"
                      >
                        Clear all files
                      </button>
                      
                      {estimatedTime > 0 && (
                        <div className="mt-4 text-amber-700 bg-amber-50 p-3 rounded-md text-sm">
                          <p className="font-medium">⚠️ Estimated processing time: {formatTime(estimatedTime)}</p>
                          <p className="mt-1">Resumes will be processed in batches to comply with API rate limits.</p>
                          <p className="mt-1">Please don&apos;t close this window during processing.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || files.length === 0}
                    className="flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSubmitting ? "Uploading & Processing..." : `Upload ${files.length} Resume${files.length !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="text-center mb-6">
              <svg className="mx-auto h-14 w-14 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete All Resumes</h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete all resumes? This action cannot be undone and will permanently delete all resume files and records.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md flex items-center"
              >
                {isDeleting && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isDeleting ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProtectedUploadPage() {
  return (
    <AdminWrapper>
      <UploadPage />
    </AdminWrapper>
  );
} 