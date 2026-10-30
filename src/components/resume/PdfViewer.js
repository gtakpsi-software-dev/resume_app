"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { buttonClass } from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Spinner from "@/components/ui/Spinner";

export default function PdfViewer({ pdfUrl, fileName = "resume.pdf" }) {
  const pagesRef = useRef(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    let objectUrl;
    let task;

    (async () => {
      try {
        const { data } = await api.get(pdfUrl, { responseType: "blob" });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setBlobUrl(objectUrl);

        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        task = pdfjs.getDocument({ data: await data.arrayBuffer() });
        const doc = await task.promise;

        const container = pagesRef.current;
        if (cancelled || !container) return;
        container.replaceChildren();
        const first = (await doc.getPage(1)).getViewport({ scale: 1 });
        const fitHeight = window.matchMedia("(min-width: 1024px)").matches;
        const width = fitHeight
          ? Math.min(container.clientWidth, container.clientHeight * (first.width / first.height))
          : container.clientWidth;
        const ratio = window.devicePixelRatio || 1;

        for (let n = 1; n <= doc.numPages; n += 1) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: (width / first.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${width}px`;
          canvas.className = "mx-auto block max-w-full rounded-xl border border-line bg-paper shadow-sm";
          container.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      task?.destroy();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfUrl]);

  return (
    <div>
      {status === "error" && <Notice tone="error">Could not load this resume. Try downloading it instead.</Notice>}
      <div className={`relative ${status === "error" ? "hidden" : ""}`}>
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
        )}
        <div ref={pagesRef} className="min-h-64 space-y-4 lg:h-[calc(92vh-11rem)] lg:overflow-y-auto" />
      </div>
      {blobUrl && (
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <a href={blobUrl} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "ghost", size: "sm" })}>
            Open in new tab
          </a>
          <a href={blobUrl} download={fileName} className={buttonClass({ variant: "outline", size: "sm" })}>
            Download PDF
          </a>
        </div>
      )}
    </div>
  );
}
