"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthContext";
import { resumeAPI } from "@/lib/api";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Notice from "@/components/ui/Notice";
import Spinner from "@/components/ui/Spinner";
import Tag from "@/components/ui/Tag";

const PdfViewer = dynamic(() => import("./PdfViewer"), { ssr: false, loading: () => <Spinner /> });

const known = (value) => value && value !== "Unspecified";

export default function ResumeCard({ resume, onDelete }) {
  const { isAuthenticated: isAdmin } = useAuth();
  const [viewing, setViewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const { id, name, major, graduationYear, signedPdfUrl, companies = [] } = resume;
  const details = [known(major) && major, known(graduationYear) && `Class of ${graduationYear}`].filter(Boolean);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await resumeAPI.delete(id);
      setConfirming(false);
      onDelete?.(id);
    } catch (error) {
      setDeleteError(error.response?.data?.message || "Could not delete this resume. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="flex flex-col rounded-[30px] border border-line bg-paper p-6 transition-shadow hover:shadow-lg">
      <h3 className="font-display text-lg uppercase tracking-[0.08em] text-ink" title={name}>
        {name}
      </h3>
      {details.length > 0 && <p className="mt-1 text-sm text-muted">{details.join(" · ")}</p>}

      {companies.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {companies.map((company) => (
            <Tag key={company}>{company}</Tag>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center gap-3 pt-6">
        <Button size="sm" onClick={() => setViewing(true)} disabled={!signedPdfUrl}>
          View resume
        </Button>
        {isAdmin && (
          <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/5" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        )}
      </div>

      <Modal open={viewing} onClose={() => setViewing(false)} title={name} size="lg">
        <PdfViewer pdfUrl={signedPdfUrl} fileName={`${name}.pdf`} />
      </Modal>

      <Modal open={confirming} onClose={() => !deleting && setConfirming(false)} title="Delete resume">
        <div className="space-y-5 p-6">
          <p className="text-ink-soft">
            Remove <span className="text-ink">{name}</span> from the resume book? The file is kept for 30 days before it is permanently removed.
          </p>
          <Notice tone="error">{deleteError}</Notice>
          <div className="flex justify-end gap-3">
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </article>
  );
}
