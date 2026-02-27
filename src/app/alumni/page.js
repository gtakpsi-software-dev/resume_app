import React from "react";

const dummyAlumni = [
  {
    name: "Alex Chen",
    gradYear: "Spring 2022",
    company: "McKinsey & Company",
  },
  {
    name: "Priya Patel",
    gradYear: "Fall 2021",
    company: "Goldman Sachs",
  },
  {
    name: "Michael Johnson",
    gradYear: "Spring 2020",
    company: "Google",
  },
  {
    name: "Sarah Lee",
    gradYear: "Fall 2019",
    company: "Deloitte",
  },
];

export default function AlumniPage() {
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
                  <p className="text-sm text-[#6e6e73]">
                    Current Role:{" "}
                    <span className="font-medium">{alum.company}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

