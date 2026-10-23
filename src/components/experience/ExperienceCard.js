"use client";

import { useState } from "react";
import { BuildingOfficeIcon, StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import Modal from "@/components/ui/Modal";
import Tag from "@/components/ui/Tag";

const typeLabels = { interview: "Interview", internship: "Internship", research: "Research" };
const outcomeLabels = { offered: "Offered", rejected: "Rejected", withdrew: "Withdrew", pending: "Pending" };
const outcomeStyles = {
  offered: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
};
const sentimentLabels = { positive: "Positive", neutral: "Neutral", negative: "Negative" };

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : "";

function Stars({ rating }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        n <= rating ? (
          <StarIconSolid key={n} className="h-4 w-4 text-ink" />
        ) : (
          <StarIcon key={n} className="h-4 w-4 text-line" />
        )
      )}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-xs uppercase tracking-[0.2em] text-muted">{title}</h3>
      <div className="whitespace-pre-wrap text-ink-soft">{children}</div>
    </div>
  );
}

export default function ExperienceCard({ experience, currentUserId, onEdit, onDelete, onToggleBookmark }) {
  const [showDetails, setShowDetails] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  if (!experience) return null;

  const {
    _id,
    user,
    type,
    company,
    companyLogo,
    role,
    startDate,
    endDate,
    outcome,
    description,
    rating,
    sentiment,
    interviewQuestions,
    advice,
    contactEmail,
    contactPhone,
    contactLinkedIn,
    bookmarkedBy,
  } = experience;

  const ownerId = user && typeof user === "object" ? user._id || user.id : user;
  const ownerName = user && typeof user === "object" ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "";
  const isOwn = currentUserId && String(ownerId) === String(currentUserId);
  const isBookmarked = currentUserId && bookmarkedBy?.some((u) => String(u) === String(currentUserId));
  const dates = `${formatDate(startDate)}${endDate ? ` – ${formatDate(endDate)}` : ""}`;
  const hasContact = contactEmail || contactPhone || contactLinkedIn;
  const actionClass = "font-display text-xs uppercase tracking-[0.15em]";

  return (
    <>
      <article className="flex h-full flex-col rounded-[30px] border border-line bg-paper p-6 transition-shadow hover:shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-mist">
            {companyLogo && !logoFailed ? (
              <img src={companyLogo} alt={company} className="h-full w-full object-contain" onError={() => setLogoFailed(true)} />
            ) : (
              <BuildingOfficeIcon className="h-7 w-7 text-muted" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg uppercase tracking-[0.06em]">{company}</h3>
            <p className="truncate text-ink-soft">{role}</p>
          </div>
          <button
            type="button"
            onClick={() => onToggleBookmark?.(_id)}
            className="rounded-full p-1.5 hover:bg-mist"
            aria-label={isBookmarked ? "Remove from saved" : "Save"}
            aria-pressed={!!isBookmarked}
          >
            {isBookmarked ? <StarIconSolid className="h-5 w-5 text-ink" /> : <StarIcon className="h-5 w-5 text-muted" />}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Tag tone="dark">{typeLabels[type] || type}</Tag>
          {outcome && (
            <span className={`rounded-full px-3 py-1 text-xs ${outcomeStyles[outcome] || "border border-line bg-mist text-ink-soft"}`}>
              {outcomeLabels[outcome] || outcome}
            </span>
          )}
          <span className="text-sm text-muted">{dates}</span>
        </div>

        {description && <p className="mt-4 line-clamp-3 text-sm text-ink-soft">{description}</p>}

        {(rating || sentiment) && (
          <div className="mt-4 flex items-center gap-3 text-sm text-muted">
            {rating && <Stars rating={rating} />}
            {sentiment && <span>{sentimentLabels[sentiment] || sentiment}</span>}
          </div>
        )}

        {ownerName && <p className="mt-4 text-xs text-muted">Shared by {ownerName}</p>}

        <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
          <button type="button" onClick={() => setShowDetails(true)} className={`${actionClass} text-ink hover:underline underline-offset-4`}>
            Details &rarr;
          </button>
          {isOwn && (
            <div className="flex gap-4">
              <button type="button" onClick={() => onEdit?.(experience)} className={`${actionClass} text-ink-soft hover:text-ink`}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete?.(experience)} className={`${actionClass} text-danger hover:text-danger/80`}>
                Delete
              </button>
            </div>
          )}
        </div>
      </article>

      <Modal open={showDetails} onClose={() => setShowDetails(false)} title={`${role} at ${company}`}>
        <div className="space-y-6 p-6">
          <p className="text-sm text-muted">
            {typeLabels[type] || type} · {dates}
            {ownerName && ` · Shared by ${ownerName}`}
          </p>
          {description && <Section title="Details">{description}</Section>}
          {interviewQuestions && <Section title="Interview questions">{interviewQuestions}</Section>}
          {advice && <Section title="Advice">{advice}</Section>}
          {hasContact && (
            <Section title="Preferred contact">
              <div className="space-y-1">
                {contactEmail && (
                  <a href={`mailto:${contactEmail}`} className="block underline-offset-4 hover:underline">
                    {contactEmail}
                  </a>
                )}
                {contactPhone && <p>{contactPhone}</p>}
                {contactLinkedIn && (
                  <a href={contactLinkedIn} target="_blank" rel="noopener noreferrer" className="block underline-offset-4 hover:underline">
                    LinkedIn profile
                  </a>
                )}
              </div>
            </Section>
          )}
          {!description && !interviewQuestions && !advice && !hasContact && (
            <p className="text-muted">No additional details were shared.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
