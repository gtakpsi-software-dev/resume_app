"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRightIcon, BriefcaseIcon, EnvelopeIcon, LinkIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/AuthContext";
import { resumeAPI } from "@/lib/api";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Notice from "@/components/ui/Notice";
import Spinner from "@/components/ui/Spinner";
import Tag from "@/components/ui/Tag";

const PdfViewer = dynamic(() => import("./PdfViewer"), { ssr: false, loading: () => <Spinner /> });

const known = (value) => value && value !== "Unspecified";
const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
const safeUrl = (url) => (/^https?:\/\//i.test(url || "") ? url : "");

export default function ResumeCard({ resume, onDelete }) {
  const { isAuthenticated: isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const { id, name, major, graduationYear, status, signedPdfUrl, email, phone, linkedin, companies = [], keywords = [], reasons = [] } = resume;
  const details = [known(major) && major, known(graduationYear) && `Class of ${graduationYear}`].filter(Boolean);
  const shownCompanies = companies.slice(0, 2);
  const linkedinUrl = safeUrl(linkedin);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await resumeAPI.delete(id);
      setConfirming(false);
      setOpen(false);
      onDelete?.(id);
    } catch (error) {
      setDeleteError(error.response?.data?.message || "Could not delete this resume. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-full min-w-0 flex-col break-words rounded-[30px] border border-line bg-paper p-6 text-left transition hover:-translate-y-0.5 hover:border-ink hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <div className="flex w-full items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm tracking-[0.08em] text-paper">
            {initials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base uppercase tracking-[0.08em] text-ink">{name}</h3>
            {details.length > 0 && <p className="mt-0.5 text-sm text-muted">{details.join(" · ")}</p>}
          </div>
          {status && (
            <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft">
              {status === "alumni" ? "Alum" : "Student"}
            </span>
          )}
        </div>

        {shownCompanies.length > 0 && (
          <p className="mt-5 flex items-center gap-2 text-sm text-ink-soft">
            <BriefcaseIcon className="h-4 w-4 shrink-0 text-muted" />
            <span className="truncate">
              {shownCompanies.join(" · ")}
              {companies.length > 2 && <span className="text-muted"> +{companies.length - 2}</span>}
            </span>
          </p>
        )}

        <div className="mt-auto flex w-full items-end justify-between gap-3 pt-5">
          <p className="truncate text-xs text-muted">{reasons.join(" · ")}</p>
          <span className="flex shrink-0 items-center gap-1 font-display text-xs uppercase tracking-[0.15em] text-ink opacity-60 transition group-hover:opacity-100">
            View
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={name} size="document">
        <div className="grid gap-6 p-6 lg:grid-cols-[260px_1fr]">
          <div className="space-y-6">
            {details.length > 0 && <p className="text-ink-soft">{details.join(" · ")}</p>}

            {(email || phone || linkedinUrl) && (
              <div className="space-y-2 text-sm">
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-2 text-ink hover:underline">
                    <EnvelopeIcon className="h-4 w-4 text-muted" />
                    <span className="truncate">{email}</span>
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-2 text-ink hover:underline">
                    <PhoneIcon className="h-4 w-4 text-muted" />
                    {phone}
                  </a>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-ink hover:underline">
                    <LinkIcon className="h-4 w-4 text-muted" />
                    LinkedIn
                  </a>
                )}
              </div>
            )}

            {companies.length > 0 && (
              <div>
                <p className="mb-2 font-display text-xs uppercase tracking-[0.2em] text-muted">Experience</p>
                <div className="flex flex-wrap gap-2">
                  {companies.map((company) => (
                    <Tag key={company}>{company}</Tag>
                  ))}
                </div>
              </div>
            )}

            {keywords.length > 0 && (
              <div>
                <p className="mb-2 font-display text-xs uppercase tracking-[0.2em] text-muted">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <Tag key={keyword}>{keyword}</Tag>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && (
              <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/5" onClick={() => setConfirming(true)}>
                Delete resume
              </Button>
            )}
          </div>

          {signedPdfUrl ? (
            <PdfViewer pdfUrl={signedPdfUrl} fileName={`${name}.pdf`} />
          ) : (
            <Notice>No PDF on file for this resume.</Notice>
          )}
        </div>
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
    </>
  );
}
