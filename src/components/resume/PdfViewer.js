"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function PdfViewer({ pdfUrl, fileName = "resume.pdf" }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    api
      .get(pdfUrl, { responseType: "blob" })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfUrl]);

  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-[#ff3b30] text-center">
          <p className="text-xl font-semibold">Failed to load PDF</p>
          <p className="mt-2">Please try again later or contact support</p>
        </div>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0071e3]"></div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-container w-full h-full">
      <iframe src={blobUrl} className="w-full h-[70vh] border-0" title="Resume PDF Viewer" />
      <div className="mt-4 pb-4 text-center">
        <a
          href={blobUrl}
          download={fileName}
          className="text-[#0071e3] hover:text-[#0077ed] font-medium px-4 py-2 rounded-full border border-[#d2d2d7] transition-colors"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}
