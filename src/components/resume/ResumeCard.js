"use client";

import { useState } from "react";
import { formatGraduationYear } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthContext";
import { resumeAPI } from "@/lib/api";
import { BriefcaseIcon, AcademicCapIcon, CalendarIcon } from '@heroicons/react/24/outline';
import EditResumeModal from "@/components/EditResumeModal";

// Dynamically import PdfViewer to avoid SSR issues
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#0071e3]"></div>
    </div>
  ),
});

export default function ResumeCard({ resume, onDelete, onSave }) {
  const [showPdf, setShowPdf] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  if (!resume) return null;

  const { id, name, major, graduationYear, pdfUrl, signedPdfUrl, companies } = resume;

  const companyList = Array.isArray(companies) ? companies : [];

  const togglePdfView = () => {
    setShowPdf(!showPdf);
  };
  
  const handleDeleteClick = () => {
    setShowConfirmDialog(true);
  };
  
  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
  };
  
  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await resumeAPI.delete(id);
      setShowConfirmDialog(false);
      // Notify parent that this resume was deleted
      if (onDelete) {
        onDelete(id);
      }
    } catch (error) {
      console.error('Error deleting resume:', error);
      alert('Failed to delete resume. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="px-6 py-5 flex-grow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-[#1d1d1f] truncate" title={name}>{name}</h3>
          <div className="ml-2 flex-shrink-0 flex space-x-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-[#0071e3] hover:text-[#0077ed] transition-colors"
                  aria-label="Edit resume"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="text-xs text-[#ff3b30] hover:text-red-700 transition-colors"
                  disabled={isDeleting}
                  aria-label="Delete resume"
                >
                  {isDeleting ? '...' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-3 space-y-3 text-sm text-[#6e6e73]">
          <div className="flex items-center space-x-2">
            <AcademicCapIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-blue-50 text-[#0071e3]">
              {major}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-[#6e6e73]">
              {formatGraduationYear(graduationYear)}
            </span>
          </div>
          
          {companyList.length > 0 && (
            <div className="flex items-center space-x-2">
              <BriefcaseIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {companyList.map((company, index) => (
                  <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-green-50 text-green-700">
                    {company}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-auto border-t border-[#e8e8ed]">
        <button
          onClick={togglePdfView}
          className="w-full py-3 font-medium text-[#0071e3] hover:bg-[#f0f0f5] transition-colors focus:outline-none"
        >
          {showPdf ? "Hide Resume" : "View Resume"}
        </button>
      </div>
      
      {/* PDF Viewer Modal */}
      {showPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[#e8e8ed] flex justify-between items-center">
              <h3 className="text-lg font-medium text-[#1d1d1f]">{name}&apos;s Resume</h3>
              <button 
                onClick={togglePdfView}
                className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {signedPdfUrl ? (
                <PdfViewer pdfUrl={signedPdfUrl} />
              ) : (
                <div className="px-6 py-4 text-[#ff3b30] text-sm text-center">
                  Could not load PDF preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {isEditing && (
        <EditResumeModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          resume={resume}
          onSave={(updated) => {
            if (onSave) onSave(updated);
          }}
        />
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-[#1d1d1f] mb-2">Confirm Deletion</h3>
            <p className="text-sm text-[#6e6e73] mb-6">
              Are you sure you want to delete this resume? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm text-[#0071e3] bg-white border border-[#d2d2d7] rounded-full hover:bg-gray-50 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm text-white bg-[#ff3b30] rounded-full hover:bg-red-600 transition-colors"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 