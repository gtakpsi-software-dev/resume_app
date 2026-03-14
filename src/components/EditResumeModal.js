"use client";

import { useState, useEffect } from "react";
import { resumeAPI } from "@/lib/api";

export default function EditResumeModal({ isOpen, onClose, resume, onSave }) {
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [companies, setCompanies] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [companyInput, setCompanyInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resume) return;
    setMajor(resume.major ?? "");
    setGraduationYear(resume.graduationYear ?? "");
    setCompanies(Array.isArray(resume.companies) ? [...resume.companies] : []);
    setKeywords(Array.isArray(resume.keywords) ? [...resume.keywords] : []);
    setCompanyInput("");
    setKeywordInput("");
    setError("");
  }, [resume, isOpen]);

  const addCompany = () => {
    const val = companyInput.trim();
    if (val && !companies.includes(val)) {
      setCompanies((prev) => [...prev, val]);
      setCompanyInput("");
    }
  };

  const removeCompany = (index) => {
    setCompanies((prev) => prev.filter((_, i) => i !== index));
  };

  const addKeyword = () => {
    const val = keywordInput.trim();
    if (val && !keywords.includes(val)) {
      setKeywords((prev) => [...prev, val]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (index) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!resume) return;
    const id = resume.id ?? resume._id;
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await resumeAPI.update(id, {
        major,
        graduationYear,
        companies,
        keywords,
      });
      const updated = data?.data ?? data;
      if (onSave) onSave(updated);
      onClose();
    } catch (err) {
      console.error("Edit resume error:", err);
      setError(err.response?.data?.message || "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-[#e8e8ed] flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-semibold text-[#1d1d1f]">Edit Resume</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="text-sm text-[#ff3b30] bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#6e6e73] mb-1">Major</label>
            <input
              type="text"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full px-3 py-2 text-[#1d1d1f] border border-[#d2d2d7] rounded-lg focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
              placeholder="e.g. Computer Science"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6e6e73] mb-1">Graduation Year</label>
            <input
              type="text"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              className="w-full px-3 py-2 text-[#1d1d1f] border border-[#d2d2d7] rounded-lg focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3]"
              placeholder="e.g. 2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6e6e73] mb-2">Companies</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {companies.map((c, i) => (
                <span
                  key={`${c}-${i}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-green-50 text-green-700"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => removeCompany(i)}
                    className="text-green-600 hover:text-red-600 transition-colors"
                    aria-label={`Remove ${c}`}
                  >
                    <span className="sr-only">Remove</span>
                    <span aria-hidden>×</span>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompany())}
                className="flex-1 px-3 py-2 text-sm text-[#1d1d1f] border border-[#d2d2d7] rounded-lg focus:ring-1 focus:ring-[#0071e3] focus:border-[#0071e3]"
                placeholder="Add company"
              />
              <button
                type="button"
                onClick={addCompany}
                className="px-4 py-2 text-sm font-medium text-[#0071e3] border border-[#0071e3] rounded-lg hover:bg-[#f0f0f5] transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6e6e73] mb-2">Skills / Keywords</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {keywords.map((k, i) => (
                <span
                  key={`${k}-${i}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-[#0071e3]"
                >
                  {k}
                  <button
                    type="button"
                    onClick={() => removeKeyword(i)}
                    className="text-[#0071e3] hover:text-red-600 transition-colors"
                    aria-label={`Remove ${k}`}
                  >
                    <span className="sr-only">Remove</span>
                    <span aria-hidden>×</span>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                className="flex-1 px-3 py-2 text-sm text-[#1d1d1f] border border-[#d2d2d7] rounded-lg focus:ring-1 focus:ring-[#0071e3] focus:border-[#0071e3]"
                placeholder="Add skill or keyword"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-4 py-2 text-sm font-medium text-[#0071e3] border border-[#0071e3] rounded-lg hover:bg-[#f0f0f5] transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#e8e8ed] flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#0071e3] bg-white border border-[#d2d2d7] rounded-full hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-[#0071e3] rounded-full hover:bg-[#0077ed] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
