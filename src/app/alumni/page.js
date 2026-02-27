"use client";

import React, { useState } from "react";

const dummyAlumni = [
  {
    name: "Alex Chen",
    gradYear: "Spring 2022",
    company: "McKinsey & Company",
    email: "alex.chen@example.com",
    phone: "(555) 123-4567",
    linkedin: "https://www.linkedin.com/in/alex-chen",
    instagram: "https://www.instagram.com/alexchen",
  },
  {
    name: "Priya Patel",
    gradYear: "Fall 2021",
    company: "Goldman Sachs",
    email: "priya.patel@example.com",
    phone: "(555) 987-6543",
    linkedin: "https://www.linkedin.com/in/priya-patel",
    instagram: "https://www.instagram.com/priyapatel",
  },
  {
    name: "Michael Johnson",
    gradYear: "Spring 2020",
    company: "Google",
    email: "michael.johnson@example.com",
    phone: "(555) 246-8101",
    linkedin: "https://www.linkedin.com/in/michael-johnson",
    instagram: "https://www.instagram.com/michaeljohnson",
  },
  {
    name: "Sarah Lee",
    gradYear: "Fall 2019",
    company: "Deloitte",
    email: "sarah.lee@example.com",
    phone: "(555) 369-1215",
    linkedin: "https://www.linkedin.com/in/sarah-lee",
    instagram: "https://www.instagram.com/sarahlee",
  },
];

export default function AlumniPage() {
  const [selectedAlum, setSelectedAlum] = useState(null);

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dummyAlumni.map((alum) => (
              <div
                key={alum.name}
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
                    <span className="font-medium">{alum.company}</span>
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
                  {selectedAlum.gradYear} · {selectedAlum.company}
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

              <div>
                <p className="text-xs uppercase tracking-wide text-[#6e6e73] mb-1">
                  Instagram
                </p>
                <a
                  href={selectedAlum.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#0071e3] hover:text-[#0077ed] break-all"
                >
                  {selectedAlum.instagram}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

