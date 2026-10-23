"use client";

import { useCallback, useEffect, useState } from "react";
import { resumeAPI } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Notice from "@/components/ui/Notice";
import Modal from "@/components/ui/Modal";

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

function ContactRow({ label, href, value, external }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <a
        href={href}
        className="mt-1 block break-all text-ink underline-offset-4 hover:underline"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {value}
      </a>
    </div>
  );
}

function AlumniPage() {
  const [alumni, setAlumni] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    resumeAPI
      .search({ status: "alumni", sort: "class" })
      .then(({ data }) =>
        setAlumni(
          (data?.data || []).map((resume) => ({
            id: resume.id,
            name: resume.name || "Unknown",
            gradYear: resume.graduationYear,
            company: resume.companies?.[0] || "",
            email: resume.email || "",
            phone: resume.phone || "",
            linkedin: /^https?:\/\//i.test(resume.linkedin || "") ? resume.linkedin : "",
          }))
        )
      )
      .catch(() => setError("Unable to load alumni right now."))
      .finally(() => setIsLoading(false));
  }, []);

  const close = useCallback(() => setSelected(null), []);
  const hasContact = selected && (selected.email || selected.phone || selected.linkedin);

  return (
    <>
      <PageHeader
        eyebrow="Epsilon Sigma"
        title="Alumni"
        description="Where our brothers went after Georgia Tech. Reach out to alumni in the fields you are aiming for."
      />

      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <Notice tone="error">{error}</Notice>
        ) : alumni.length === 0 ? (
          <EmptyState title="No alumni yet" description="Brothers show up here once their graduation year has passed." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {alumni.map((alum) => (
              <button
                key={alum.id}
                type="button"
                onClick={() => setSelected(alum)}
                className="flex items-start gap-4 rounded-[30px] bg-paper p-6 text-left transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-ink"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink font-display text-paper">
                  {initials(alum.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-lg">{alum.name}</span>
                  <span className="block text-sm text-muted">Class of {alum.gradYear}</span>
                  {alum.company && <span className="mt-2 block truncate text-sm text-ink-soft">{alum.company}</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={close} title={selected?.name || ""}>
        {selected && (
          <div className="space-y-5 p-6">
            <p className="text-sm text-muted">
              Class of {selected.gradYear}
              {selected.company ? ` · ${selected.company}` : ""}
            </p>
            <ContactRow label="Email" href={`mailto:${selected.email}`} value={selected.email} />
            <ContactRow label="Phone" href={`tel:${selected.phone}`} value={selected.phone} />
            <ContactRow label="LinkedIn" href={selected.linkedin} value={selected.linkedin} external />
            {!hasContact && <p className="text-sm text-muted">No contact details on file.</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

export default function ProtectedAlumniPage() {
  return (
    <ProtectedRoute>
      <AlumniPage />
    </ProtectedRoute>
  );
}
