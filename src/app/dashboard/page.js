"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import ExperienceCard from "@/components/experience/ExperienceCard";
import { experienceAPI } from "@/lib/api";
import { useMemberAuth } from "@/lib/MemberAuthContext";

export default function Dashboard() {
  const { user: memberUser } = useMemberAuth();
  const [type, setType] = useState("interview");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [outcome, setOutcome] = useState("");
  const [description, setDescription] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [rating, setRating] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [interviewQuestions, setInterviewQuestions] = useState("");
  const [advice, setAdvice] = useState("");
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchExperiences();
  }, []);

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      const { data } = await experienceAPI.getAllExperiences();
      setExperiences(data.data || []);
    } catch (err) {
      console.error("Failed to fetch experiences:", err);
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!company.trim()) {
      setError("Company is required");
      return;
    }
    if (!role.trim()) {
      setError("Role/Position is required");
      return;
    }
    if (!startDate) {
      setError("Start date is required");
      return;
    }

    setSubmitting(true);

    try {
      await experienceAPI.create({
        type,
        company: company.trim(),
        role: role.trim(),
        startDate,
        endDate: endDate || null,
        outcome: type === "interview" ? outcome : "",
        description: description.trim() || "",
        companyLogo: companyLogo.trim() || "",
        rating: rating ? Number(rating) : null,
        sentiment: sentiment || "",
        interviewQuestions: interviewQuestions.trim() || "",
        advice: advice.trim() || "",
      });
      setSuccess("Experience added successfully!");
      setCompany("");
      setRole("");
      setStartDate("");
      setEndDate("");
      setOutcome("");
      setDescription("");
      setCompanyLogo("");
      setRating("");
      setSentiment("");
      setInterviewQuestions("");
      setAdvice("");
      fetchExperiences();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to add experience";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this experience?")) return;
    try {
      await experienceAPI.delete(id);
      setSuccess("Experience deleted.");
      fetchExperiences();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete.");
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-64px)] bg-[#f5f5f7] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-semibold text-[#1d1d1f] mb-2">
            Brother Dashboard
          </h1>
          <p className="text-[#6e6e73] mb-8">
            Add your past interviews, internships, and research experiences.
          </p>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Form */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-medium text-[#1d1d1f] mb-6">
                Add Experience
              </h2>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-700 border border-green-100">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                  >
                    <option value="interview">Interview</option>
                    <option value="internship">Internship</option>
                    <option value="research">Research</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Company / Institution <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google, Georgia Tech"
                    className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Company logo URL
                  </label>
                  <input
                    type="url"
                    value={companyLogo}
                    onChange={(e) => setCompanyLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Role / Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Software Engineer Intern, Research Assistant"
                    className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                  />
                </div>

                {type === "interview" && (
                  <div>
                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                      Offer status / Outcome
                    </label>
                    <select
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                    >
                      <option value="">Select outcome</option>
                      <option value="pending">Pending</option>
                      <option value="offered">Offered</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrew">Withdrew</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Rating (1–5)
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                  >
                    <option value="">No rating</option>
                    <option value="1">1 – Poor</option>
                    <option value="2">2 – Fair</option>
                    <option value="3">3 – Average</option>
                    <option value="4">4 – Good</option>
                    <option value="5">5 – Excellent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Sentiment
                  </label>
                  <select
                    value={sentiment}
                    onChange={(e) => setSentiment(e.target.value)}
                    className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                  >
                    <option value="">Select sentiment</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Experience details
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description of the experience (optional)"
                    className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm resize-none"
                  />
                </div>

                {type === "interview" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                        Interview questions
                      </label>
                      <textarea
                        value={interviewQuestions}
                        onChange={(e) => setInterviewQuestions(e.target.value)}
                        rows={3}
                        placeholder="Questions you were asked (optional)"
                        className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                        Advice
                      </label>
                      <textarea
                        value={advice}
                        onChange={(e) => setAdvice(e.target.value)}
                        rows={3}
                        placeholder="Tips for future interviewees (optional)"
                        className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm resize-none"
                      />
                    </div>
                  </>
                )}

                {(type === "internship" || type === "research") && (
                  <div>
                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                      Advice
                    </label>
                    <textarea
                      value={advice}
                      onChange={(e) => setAdvice(e.target.value)}
                      rows={3}
                      placeholder="Tips for others (optional)"
                      className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm resize-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-[#0071e3] px-4 py-3 font-medium text-white hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Adding..." : "Add Experience"}
                </button>
              </form>
            </div>

            {/* Experience Cards - shared by all brothers */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-medium text-[#1d1d1f] mb-1">
                Brother Experiences
              </h2>
              <p className="text-sm text-[#6e6e73] mb-6">
                Experiences shared by all brothers — add yours to contribute
              </p>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#0071e3]" />
                </div>
              ) : experiences.length === 0 ? (
                <div className="text-center py-12 text-[#6e6e73]">
                  <p>No experiences shared yet.</p>
                  <p className="text-sm mt-1">Be the first to add one using the form.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {experiences.map((exp) => (
                    <ExperienceCard
                      key={exp._id}
                      experience={exp}
                      currentUserId={memberUser?.id}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/search"
              className="text-[#0071e3] hover:text-[#0077ed] font-medium"
            >
              ← Back to Resume Search
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
