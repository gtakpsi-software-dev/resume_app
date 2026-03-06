"use client";

import { useState } from "react";
import {
  BuildingOfficeIcon,
  CalendarIcon,
  ChevronRightIcon,
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

export default function ExperienceCard({ experience, currentUserId, onDelete }) {
  const [showFullDetails, setShowFullDetails] = useState(false);

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

  const formatDate = (d) => {
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const typeLabel = (t) => {
    if (t === "interview") return "Interview";
    if (t === "internship") return "Internship";
    if (t === "research") return "Research";
    return t;
  };

  const outcomeLabel = (o) => {
    if (!o) return null;
    const labels = {
      offered: "Offered",
      rejected: "Rejected",
      withdrew: "Withdrew",
      pending: "Pending",
    };
    return labels[o] || o;
  };

  const outcomeColor = (o) => {
    const colors = {
      offered: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      withdrew: "bg-amber-100 text-amber-800",
      pending: "bg-blue-100 text-blue-800",
    };
    return colors[o] || "bg-gray-100 text-gray-800";
  };

  const sentimentLabel = (s) => {
    if (!s) return null;
    const labels = { positive: "Positive", neutral: "Neutral", negative: "Negative" };
    return labels[s] || s;
  };

  const sentimentColor = (s) => {
    const colors = {
      positive: "text-green-600",
      neutral: "text-gray-600",
      negative: "text-red-600",
    };
    return colors[s] || "text-gray-600";
  };

  const ownerId =
    user && typeof user === "object" ? user._id || user.id || user : user;
  const ownerName =
    user && typeof user === "object"
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || null
      : null;

  const isOwnExperience =
    currentUserId && String(ownerId) === String(currentUserId);

  const isBookmarked =
    Array.isArray(bookmarkedBy) &&
    currentUserId &&
    bookmarkedBy.some((u) => String(u) === String(currentUserId));

  const handleDelete = () => {
    if (confirm("Delete this experience?")) onDelete?.(_id);
  };

  const hasFullDetails = description?.trim() || interviewQuestions?.trim() || advice?.trim();

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
        <div className="p-6 flex-grow">
          {/* Top row: company + bookmark */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#f5f5f7] flex items-center justify-center overflow-hidden">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={company}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full flex items-center justify-center ${
                  companyLogo ? "hidden" : ""
                }`}
              >
                <BuildingOfficeIcon className="w-7 h-7 text-[#86868b]" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-[#1d1d1f] truncate">
                {company}
              </h3>
              <p className="text-[#0071e3] font-medium truncate">{role}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0071e3]/10 text-[#0071e3]">
                {typeLabel(type)}
              </span>
              {ownerName && (
                <p className="mt-1 text-xs text-[#6e6e73]">
                  Shared by <span className="font-medium text-[#1d1d1f]">{ownerName}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onToggleBookmark?.(_id)}
              className="ml-2 inline-flex items-center justify-center rounded-full p-1.5 hover:bg-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2"
              aria-label={isBookmarked ? "Remove from saved" : "Save to revisit"}
            >
              {isBookmarked ? (
                <StarIconSolid className="w-5 h-5 text-amber-500" />
              ) : (
                <StarIcon className="w-5 h-5 text-[#d2d2d7]" />
              )}
            </button>
          </div>

          {/* Offer Status */}
          {outcome && (
            <div className="mb-3">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${outcomeColor(
                  outcome
                )}`}
              >
                Offer: {outcomeLabel(outcome)}
              </span>
            </div>
          )}

          {/* Experience details (brief) */}
          {description && (
            <p className="text-sm text-[#6e6e73] line-clamp-3 mb-3">
              {description}
            </p>
          )}

          {/* Date range */}
          <div className="flex items-center gap-1.5 text-sm text-[#6e6e73] mb-3">
            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
            <span>
              {formatDate(startDate)}
              {endDate && ` – ${formatDate(endDate)}`}
            </span>
          </div>

          {/* Contact info */}
          {(contactEmail || contactPhone || contactLinkedIn) && (
            <div className="mb-3 text-xs text-[#6e6e73] space-y-1">
              <p className="font-medium text-[#1d1d1f]">Preferred contact</p>
              {contactEmail && <p>Email: <span className="font-medium">{contactEmail}</span></p>}
              {contactPhone && <p>Phone: <span className="font-medium">{contactPhone}</span></p>}
              {contactLinkedIn && (
                <p>
                  LinkedIn:{" "}
                  <a
                    href={contactLinkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#0071e3] hover:text-[#0077ed]"
                  >
                    View profile
                  </a>
                </p>
              )}
            </div>
          )}

          {/* Rating / Sentiment */}
          {(rating || sentiment) && (
            <div className="flex items-center gap-3 flex-wrap mb-4">
              {rating && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className="text-amber-500">
                      {n <= rating ? (
                        <StarIconSolid className="w-4 h-4" />
                      ) : (
                        <StarIcon className="w-4 h-4 text-[#d2d2d7]" />
                      )}
                    </span>
                  ))}
                  <span className="text-xs text-[#6e6e73] ml-1">
                    {rating}/5
                  </span>
                </div>
              )}
              {sentiment && (
                <span
                  className={`text-xs font-medium ${sentimentColor(sentiment)}`}
                >
                  {sentimentLabel(sentiment)}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#e8e8ed]">
            {hasFullDetails ? (
              <button
                onClick={() => setShowFullDetails(true)}
                className="flex items-center gap-1 font-medium text-[#0071e3] hover:text-[#0077ed] transition-colors focus:outline-none"
              >
                View full details
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <span />
            )}
            {isOwnExperience && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onEdit?.(experience)}
                  className="text-sm text-[#0071e3] hover:text-[#0077ed] font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full details modal */}
      {showFullDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            <div className="p-6 border-b border-[#e8e8ed] flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-[#1d1d1f]">
                  {role} at {company}
                </h2>
                <p className="text-sm text-[#6e6e73] mt-1">
                  {typeLabel(type)} • {formatDate(startDate)}
                  {endDate && ` – ${formatDate(endDate)}`}
                </p>
                {ownerName && (
                  <p className="text-xs text-[#6e6e73] mt-1">
                    Shared by <span className="font-medium text-[#1d1d1f]">{ownerName}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowFullDetails(false)}
                className="text-[#6e6e73] hover:text-[#1d1d1f] p-1"
                aria-label="Close"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {(contactEmail || contactPhone || contactLinkedIn) && (
                <div>
                  <h3 className="text-sm font-medium text-[#1d1d1f] mb-2">
                    Preferred contact
                  </h3>
                  <div className="text-sm text-[#6e6e73] space-y-1">
                    {contactEmail && <p>Email: <span className="font-medium">{contactEmail}</span></p>}
                    {contactPhone && <p>Phone: <span className="font-medium">{contactPhone}</span></p>}
                    {contactLinkedIn && (
                      <p>
                        LinkedIn:{" "}
                        <a
                          href={contactLinkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#0071e3] hover:text-[#0077ed]"
                        >
                          View profile
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}
              {description && (
                <div>
                  <h3 className="text-sm font-medium text-[#1d1d1f] mb-2">
                    Experience details
                  </h3>
                  <p className="text-sm text-[#6e6e73] whitespace-pre-wrap">
                    {description}
                  </p>
                </div>
              )}
              {interviewQuestions && (
                <div>
                  <h3 className="text-sm font-medium text-[#1d1d1f] mb-2">
                    Interview questions
                  </h3>
                  <p className="text-sm text-[#6e6e73] whitespace-pre-wrap">
                    {interviewQuestions}
                  </p>
                </div>
              )}
              {advice && (
                <div>
                  <h3 className="text-sm font-medium text-[#1d1d1f] mb-2">
                    Advice
                  </h3>
                  <p className="text-sm text-[#6e6e73] whitespace-pre-wrap">
                    {advice}
                  </p>
                </div>
              )}
              {!description && !interviewQuestions && !advice && (
                <p className="text-sm text-[#6e6e73]">
                  No additional details available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
