"use client";

import React, { useEffect, useMemo, useState } from "react";
import { resumeAPI } from "@/lib/api";

const ALUMNI_CUTOFF_YEAR = 2027;

const extractYear = (value) => {
  if (!value) return null;
  const match = String(value).match(/\b(19\d{2}|20\d{2})\b/g);
  if (!match?.length) return null;
  const numericYears = match.map(Number).filter((year) => !Number.isNaN(year));
  if (!numericYears.length) return null;
  return Math.max(...numericYears);
};

export default function AlumniPage() {
  const [selectedAlum, setSelectedAlum] = useState(null);
  const [alumni, setAlumni] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAlumni = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await resumeAPI.getAll();
        const resumes = response?.data?.data || [];

        const alumniRecords = resumes
          .map((resume) => {
            const gradYear = extractYear(resume.graduationYear);
            if (!gradYear || gradYear > ALUMNI_CUTOFF_YEAR) return null;

            const companies = Array.isArray(resume.companies) ? resume.companies : [];
            return {
              id: resume.id,
              name: resume.name || "Unknown",
              gradYear: String(gradYear),
              currentRole: companies[0] || "",
              email: resume.email || "",
              phone: resume.phone || "",
              linkedin: resume.linkedin || "",
            };
          })
          .filter(Boolean)
          .sort((a, b) => Number(b.gradYear) - Number(a.gradYear) || a.name.localeCompare(b.name));

        setAlumni(alumniRecords);
      } catch (fetchError) {
        console.error("Failed to fetch alumni from resumes:", fetchError);
        setError("Unable to load alumni data right now.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlumni();
  }, []);

  const hasContactDetails = useMemo(() => {
    if (!selectedAlum) return false;
    return Boolean(selectedAlum.email || selectedAlum.phone || selectedAlum.linkedin);
  }, [selectedAlum]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col">
      <main className="flex-1 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] mb-2">
              Alumni Network
            </h1>
            <p className="text-sm sm:text-base text-[#6e6e73] max-w-2xl mx-auto">
              Connect with Alpha Kappa Psi alumni and learn where our brothers
              have gone after graduating from Georgia Tech.
            </p>
          </div>

          {isLoading ? (
            <p className="text-center text-sm text-[#6e6e73]">Loading alumni...</p>
          ) : error ? (
            <p className="text-center text-sm text-[#d93025]">{error}</p>
          ) : alumni.length === 0 ? (
            <p className="text-center text-sm text-[#6e6e73]">
              No alumni found from resumes with graduation year {ALUMNI_CUTOFF_YEAR} or earlier.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {alumni.map((alum) => (
                <div
                  key={alum.id || alum.name}
                  className="bg-white rounded-2xl shadow-sm border border-[#e5e5ea] p-5 flex flex-col justify-between"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-[#1d1d1f] mb-1">
                      {alum.name}
                    </h2>
                    <p className="text-sm text-[#6e6e73] mb-2">
                      Graduation: <span className="font-medium">{alum.gradYear}</span>
                    </p>
                    <p className="text-sm text-[#6e6e73] mb-4">
                      Current Role:{" "}
                      <span className="font-medium">
                        {alum.currentRole || "Not found"}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAlum(alum)}
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-[#d2d2d7] px-4 py-2 text-sm font-medium text-[#1d1d1f] bg-white hover:bg-[#f5f5f7] transition-colors"
                  >
                    Contact alum
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedAlum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[#1d1d1f]">
                  Contact {selectedAlum.name}
                </h2>
                <p className="text-sm text-[#6e6e73]">
                  {selectedAlum.gradYear}
                  {selectedAlum.currentRole ? ` · ${selectedAlum.currentRole}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlum(null)}
                className="ml-4 text-sm text-[#6e6e73] hover:text-[#1d1d1f]"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {selectedAlum.email ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#6e6e73] mb-1">
                    Email
                  </p>
                  <a
                    href={`mailto:${selectedAlum.email}`}
                    className="text-sm text-[#0071e3] hover:text-[#0077ed]"
                  >
                    {selectedAlum.email}
                  </a>
                </div>
              ) : null}

              {selectedAlum.phone ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#6e6e73] mb-1">
                    Phone
                  </p>
                  <a
                    href={`tel:${selectedAlum.phone}`}
                    className="text-sm text-[#1d1d1f]"
                  >
                    {selectedAlum.phone}
                  </a>
                </div>
              ) : null}

              {selectedAlum.linkedin ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#6e6e73] mb-1">
                    LinkedIn
                  </p>
                  <a
                    href={selectedAlum.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[#0071e3] hover:text-[#0077ed] break-all"
                  >
                    {selectedAlum.linkedin}
                  </a>
                </div>
              ) : null}

              {!hasContactDetails ? (
                <p className="text-sm text-[#6e6e73]">No contact details found.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

