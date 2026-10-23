"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { buttonClass } from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

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
      <div className="px-6 py-20 text-center">
        <p className="font-display uppercase tracking-[0.08em] text-danger">Could not load this resume</p>
        <p className="mt-2 text-sm text-muted">Close this window and try again.</p>
      </div>
    );
  }

  if (!blobUrl) {
    return <Spinner className="py-32" />;
  }

  return (
    <div>
      <iframe src={blobUrl} className="h-[70vh] w-full border-0 bg-mist" title="Resume PDF" />
      <div className="flex justify-end border-t border-line px-6 py-4">
        <a href={blobUrl} download={fileName} className={buttonClass({ variant: "outline", size: "sm" })}>
          Download PDF
        </a>
      </div>
    </div>
  );
}
