"use client";

import { useCallback, useState } from "react";
import { DocumentArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { resumeAPI } from "@/lib/api";
import AdminWrapper from "@/components/ui/AdminWrapper";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Modal from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Field";

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 10000;
const FILE_DELAY_MS = 1000;
const SECONDS_PER_FILE = 6;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const estimateSeconds = (count) => {
  if (!count) return 0;
  const batches = Math.ceil(count / BATCH_SIZE);
  return count * SECONDS_PER_FILE + (count - batches) * (FILE_DELAY_MS / 1000) + (batches - 1) * (BATCH_DELAY_MS / 1000);
};

const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} sec` : `${minutes} min`;
};

const fileKey = (file) => `${file.name}-${file.size}`;

function UploadPage() {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState("");
  const [results, setResults] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const addFiles = (incoming) => {
    const list = Array.from(incoming);
    const pdfs = list.filter((file) => file.type === "application/pdf");
    const skipped = list.length - pdfs.length;
    setNotice(skipped ? { tone: "error", text: `${skipped} file(s) were not PDFs and were skipped.` } : null);
    setFiles((prev) => {
      const seen = new Set(prev.map(fileKey));
      return [...prev, ...pdfs.filter((file) => !seen.has(fileKey(file)))];
    });
  };

  const removeFile = (key) => setFiles((prev) => prev.filter((file) => fileKey(file) !== key));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setIsSubmitting(true);
    setNotice(null);
    setResults(null);
    setProgress({ current: 0, total: files.length });

    const succeeded = [];
    const failed = [];

    for (let start = 0; start < files.length; start += BATCH_SIZE) {
      if (start > 0) {
        setStatus("Pausing between batches...");
        await sleep(BATCH_DELAY_MS);
      }
      const batch = files.slice(start, start + BATCH_SIZE);
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i];
        setStatus(`Processing ${file.name}`);
        setProgress({ current: start + i + 1, total: files.length });
        try {
          await resumeAPI.create({}, file);
          succeeded.push(file.name);
        } catch (err) {
          const message = err.response?.data?.message || err.message || "Unknown error";
          failed.push({ file: file.name, message, status: err.response?.status });
        }
        if (i < batch.length - 1) await sleep(FILE_DELAY_MS);
      }
    }

    setResults({ succeeded, failed });
    setFiles([]);
    setStatus("");
    setIsSubmitting(false);
  };

  const handleBackfill = async () => {
    setIsBackfilling(true);
    setNotice(null);
    try {
      const { data } = await resumeAPI.backfillContacts();
      const s = data?.data || {};
      setNotice({
        tone: "success",
        text: `Contact refresh finished. Scanned ${s.scanned || 0}, updated ${s.updated || 0}, skipped ${s.skipped || 0}, failed ${s.failed || 0}.`,
      });
    } catch (err) {
      setNotice({ tone: "error", text: err.response?.data?.message || "Failed to refresh contact info. Please try again." });
    } finally {
      setIsBackfilling(false);
    }
  };

  const closeDelete = useCallback(() => {
    setDeleteOpen(false);
    setDeleteText("");
  }, []);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const { data } = await resumeAPI.deleteAll();
      setNotice({ tone: "success", text: data?.message || "All resumes were deleted." });
      closeDelete();
    } catch (err) {
      setNotice({ tone: "error", text: err.response?.data?.message || "Failed to delete resumes. Please try again." });
      closeDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const percent = progress.total ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Upload" description="Add resume PDFs to the database. Name, major, graduation year, companies, and skills are pulled from each file automatically." />

      <div className="mx-auto w-full max-w-3xl space-y-8 px-5 py-12 sm:px-8">
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        <section className="rounded-[30px] bg-paper p-6 sm:p-8">
          <label
            htmlFor="pdfFiles"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center rounded-[30px] border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragging ? "border-ink bg-mist" : "border-line hover:border-ink-soft"
            } ${isSubmitting ? "pointer-events-none opacity-50" : ""}`}
          >
            <DocumentArrowUpIcon className="h-10 w-10 text-muted" />
            <span className="mt-4 font-display uppercase tracking-[0.12em]">Drop PDFs here</span>
            <span className="mt-1 text-sm text-muted">or click to choose files</span>
            <input
              id="pdfFiles"
              type="file"
              accept="application/pdf"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-baseline justify-between text-sm">
                <span className="text-ink-soft">{files.length} file{files.length === 1 ? "" : "s"} selected</span>
                <span className="text-muted">About {formatDuration(estimateSeconds(files.length))}</span>
              </div>
              <ul className="max-h-60 divide-y divide-line overflow-y-auto rounded-2xl border border-line">
                {files.map((file) => (
                  <li key={fileKey(file)} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="truncate">{file.name}</span>
                    {!isSubmitting && (
                      <button type="button" onClick={() => removeFile(fileKey(file))} aria-label={`Remove ${file.name}`} className="ml-3 rounded-full p-1 text-muted hover:bg-mist hover:text-ink">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isSubmitting && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm text-ink-soft">
                <span className="truncate">{status}</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-mist">
                <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}

          <Button onClick={handleUpload} disabled={!files.length || isSubmitting} className="mt-6 w-full">
            {isSubmitting ? "Uploading..." : `Upload ${files.length || ""} resume${files.length === 1 ? "" : "s"}`}
          </Button>
        </section>

        {results && (
          <section className="rounded-[30px] bg-paper p-6 sm:p-8">
            <h2 className="font-display text-lg uppercase tracking-[0.08em]">Results</h2>
            <p className="mt-2 text-sm text-muted">
              {results.succeeded.length} uploaded, {results.failed.length} failed.
            </p>
            {results.failed.length > 0 && (
              <ul className="mt-4 space-y-2">
                {results.failed.map((f) => (
                  <li key={f.file} className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm">
                    <span className="font-medium text-danger">{f.file}</span>
                    <span className="block text-ink-soft">
                      {f.message}
                      {f.status ? ` (${f.status})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[30px] bg-paper p-6">
            <h2 className="font-display uppercase tracking-[0.08em]">Refresh contacts</h2>
            <p className="mt-2 text-sm text-muted">Re-read every PDF and fill in missing email, phone, and LinkedIn.</p>
            <Button variant="outline" size="sm" onClick={handleBackfill} disabled={isBackfilling} className="mt-5">
              {isBackfilling ? "Refreshing..." : "Refresh contact info"}
            </Button>
          </div>
          <div className="rounded-[30px] border border-danger/20 bg-paper p-6">
            <h2 className="font-display uppercase tracking-[0.08em] text-danger">Delete all</h2>
            <p className="mt-2 text-sm text-muted">Remove every resume from search. Files are purged after 30 days.</p>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)} className="mt-5">
              Delete all resumes
            </Button>
          </div>
        </section>
      </div>

      <Modal open={deleteOpen} onClose={closeDelete} title="Delete all resumes">
        <div className="space-y-5 p-6">
          <p className="text-sm text-ink-soft">
            Every resume will disappear from search immediately. They are soft-deleted and their PDFs are permanently purged after 30 days.
          </p>
          <div>
            <Label htmlFor="confirmDelete">Type DELETE to confirm</Label>
            <Input id="confirmDelete" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={closeDelete}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteAll} disabled={deleteText !== "DELETE" || isDeleting}>
              {isDeleting ? "Deleting..." : "Delete all"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function ProtectedUploadPage() {
  return (
    <AdminWrapper>
      <UploadPage />
    </AdminWrapper>
  );
}
