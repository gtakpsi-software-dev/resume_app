"use client";

import { useState } from "react";
import { ArrowRightIcon, BriefcaseIcon, EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { buttonClass } from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Notice from "@/components/ui/Notice";
import Tag from "@/components/ui/Tag";

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const role = ({ position, company }) => [position, company].filter(Boolean).join(" at ");

export default function AlumniCard({ alum, canSeeContact }) {
  const [open, setOpen] = useState(false);
  const { name, industry, classLabel, location, major, linkedin, chapterRoles, email, phone, hasContact } = alum;
  const work = role(alum);
  const meta = [classLabel, location].filter(Boolean);

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
            {meta.length > 0 && <p className="mt-0.5 text-sm text-muted">{meta.join(" · ")}</p>}
          </div>
        </div>

        {work && (
          <p className="mt-5 flex items-start gap-2 text-sm text-ink-soft">
            <BriefcaseIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <span className="line-clamp-2">{work}</span>
          </p>
        )}

        <div className="mt-auto flex w-full items-end justify-between gap-3 pt-5">
          <p className="truncate text-xs text-muted">{industry}</p>
          <span className="flex shrink-0 items-center gap-1 font-display text-xs uppercase tracking-[0.15em] text-ink opacity-60 transition group-hover:opacity-100">
            View
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={name}>
        <div className="space-y-6 p-6">
          <div className="space-y-2 text-ink-soft">
            {work && <p className="text-ink">{work}</p>}
            {meta.length > 0 && <p className="text-sm">{meta.join(" · ")}</p>}
          </div>

          {(industry || major) && (
            <div className="flex flex-wrap gap-2">
              {industry && <Tag>{industry}</Tag>}
              {major && <Tag>{major}</Tag>}
            </div>
          )}

          {chapterRoles && (
            <div>
              <p className="mb-1 font-display text-xs uppercase tracking-[0.2em] text-muted">In the chapter</p>
              <p className="text-sm text-ink-soft">{chapterRoles}</p>
            </div>
          )}

          {canSeeContact && (email || phone) && (
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
            </div>
          )}

          {!canSeeContact && hasContact && <Notice>The chapter has contact details on file. Ask an officer to connect you.</Notice>}

          {linkedin && (
            <a href={linkedin} target="_blank" rel="noopener noreferrer" className={buttonClass({ size: "sm" })}>
              View LinkedIn
            </a>
          )}

          {!work && !linkedin && !hasContact && !chapterRoles && (
            <p className="text-sm text-muted">This is all the chapter has on file for {name.split(" ")[0]}.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
