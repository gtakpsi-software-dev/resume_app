"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ExperienceCard from "@/components/experience/ExperienceCard";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import Notice from "@/components/ui/Notice";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";
import { experienceAPI } from "@/lib/api";
import { useMemberAuth } from "@/lib/MemberAuthContext";

const emptyForm = {
  type: "interview",
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  outcome: "",
  description: "",
  companyLogo: "",
  rating: "",
  sentiment: "",
  interviewQuestions: "",
  advice: "",
  contactEmail: "",
  contactPhone: "",
  contactLinkedIn: "",
};

const tabs = [
  { key: "all", label: "All" },
  { key: "interview", label: "Interviews" },
  { key: "internship", label: "Internships" },
  { key: "research", label: "Research" },
  { key: "saved", label: "Saved" },
  { key: "mine", label: "Mine" },
];

const toForm = (exp) => ({
  ...Object.fromEntries(Object.keys(emptyForm).map((k) => [k, exp[k] ?? ""])),
  startDate: exp.startDate ? exp.startDate.slice(0, 10) : "",
  endDate: exp.endDate ? exp.endDate.slice(0, 10) : "",
  rating: typeof exp.rating === "number" ? String(exp.rating) : "",
});

const ownerOf = (exp) => String(exp.user?._id || exp.user?.id || exp.user);

function ExperienceForm({ form, setField, onSubmit, onCancel, submitting, editing, error }) {
  const isInterview = form.type === "interview";

  return (
    <form onSubmit={onSubmit} className="space-y-5 p-6">
      <Notice tone="error">{error}</Notice>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select id="type" value={form.type} onChange={setField("type")}>
            <option value="interview">Interview</option>
            <option value="internship">Internship</option>
            <option value="research">Research</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="company">Company or institution</Label>
          <Input id="company" value={form.company} onChange={setField("company")} placeholder="Google, Georgia Tech" required />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Input id="role" value={form.role} onChange={setField("role")} placeholder="Software Engineering Intern" required />
        </div>
        <div>
          <Label htmlFor="companyLogo" hint="Optional">Logo URL</Label>
          <Input id="companyLogo" type="url" value={form.companyLogo} onChange={setField("companyLogo")} placeholder="https://example.com/logo.png" />
        </div>
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" type="date" value={form.startDate} onChange={setField("startDate")} required />
        </div>
        <div>
          <Label htmlFor="endDate" hint="Optional">End date</Label>
          <Input id="endDate" type="date" value={form.endDate} onChange={setField("endDate")} />
        </div>
        {isInterview && (
          <div>
            <Label htmlFor="outcome">Outcome</Label>
            <Select id="outcome" value={form.outcome} onChange={setField("outcome")}>
              <option value="">Select outcome</option>
              <option value="pending">Pending</option>
              <option value="offered">Offered</option>
              <option value="rejected">Rejected</option>
              <option value="withdrew">Withdrew</option>
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="rating">Rating</Label>
          <Select id="rating" value={form.rating} onChange={setField("rating")}>
            <option value="">No rating</option>
            <option value="1">1 – Poor</option>
            <option value="2">2 – Fair</option>
            <option value="3">3 – Average</option>
            <option value="4">4 – Good</option>
            <option value="5">5 – Excellent</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="sentiment">Overall feeling</Label>
          <Select id="sentiment" value={form.sentiment} onChange={setField("sentiment")}>
            <option value="">Select one</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description" hint="Optional">Details</Label>
        <Textarea id="description" rows={3} value={form.description} onChange={setField("description")} placeholder="What was it like?" />
      </div>
      {isInterview && (
        <div>
          <Label htmlFor="interviewQuestions" hint="Optional">Interview questions</Label>
          <Textarea id="interviewQuestions" rows={3} value={form.interviewQuestions} onChange={setField("interviewQuestions")} placeholder="Questions you were asked" />
        </div>
      )}
      <div>
        <Label htmlFor="advice" hint="Optional">Advice</Label>
        <Textarea id="advice" rows={3} value={form.advice} onChange={setField("advice")} placeholder="Tips for the next brother" />
      </div>

      <fieldset className="border-t border-line pt-5">
        <legend className="pr-2 font-display text-xs uppercase tracking-[0.2em] text-muted">Preferred contact, optional</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" type="email" value={form.contactEmail} onChange={setField("contactEmail")} placeholder="you@gatech.edu" />
          </div>
          <div>
            <Label htmlFor="contactPhone">Phone</Label>
            <Input id="contactPhone" type="tel" value={form.contactPhone} onChange={setField("contactPhone")} placeholder="(555) 555-5555" />
          </div>
          <div>
            <Label htmlFor="contactLinkedIn">LinkedIn</Label>
            <Input id="contactLinkedIn" type="url" value={form.contactLinkedIn} onChange={setField("contactLinkedIn")} placeholder="https://linkedin.com/in/you" />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : editing ? "Save changes" : "Share experience"}
        </Button>
      </div>
    </form>
  );
}

function Dashboard() {
  const { user } = useMemberAuth();
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExperiences = async () => {
    try {
      const { data } = await experienceAPI.getAllExperiences();
      setExperiences(data.data || []);
      setLoadError("");
    } catch (err) {
      setLoadError(
        err.response?.status === 403
          ? "Experiences are only available to member accounts."
          : "Couldn't load experiences. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiences();
  }, []);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openForm = (exp) => {
    setEditingId(exp?._id || null);
    setForm(exp ? toForm(exp) : emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim() || !form.startDate) {
      setFormError("Company, role, and start date are required.");
      return;
    }

    const payload = {
      ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])),
      endDate: form.endDate || null,
      outcome: form.type === "interview" ? form.outcome : "",
      interviewQuestions: form.type === "interview" ? form.interviewQuestions.trim() : "",
      rating: form.rating ? Number(form.rating) : null,
    };

    setSubmitting(true);
    setFormError("");
    try {
      if (editingId) await experienceAPI.update(editingId, payload);
      else await experienceAPI.create(payload);
      setNotice({ tone: "success", text: editingId ? "Experience updated." : "Thanks for sharing your experience." });
      setFormOpen(false);
      await fetchExperiences();
    } catch (err) {
      setFormError(err.response?.data?.message || "Couldn't save the experience. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await experienceAPI.delete(pendingDelete._id);
      setNotice({ tone: "success", text: "Experience deleted." });
      await fetchExperiences();
    } catch (err) {
      setNotice({ tone: "error", text: err.response?.data?.message || "Couldn't delete the experience." });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleToggleBookmark = async (id) => {
    try {
      await experienceAPI.toggleBookmark(id);
      await fetchExperiences();
    } catch {
      setNotice({ tone: "error", text: "Couldn't update saved experiences. Try again." });
    }
  };

  const visible = experiences.filter((exp) => {
    if (tab === "all") return true;
    if (tab === "saved") return exp.bookmarkedBy?.some((u) => String(u) === String(user?.id));
    if (tab === "mine") return ownerOf(exp) === String(user?.id);
    return exp.type === tab;
  });

  let content;
  if (loading) {
    content = <Spinner />;
  } else if (loadError) {
    content = (
      <EmptyState
        title="Something went wrong"
        description={loadError}
        action={<Button variant="outline" onClick={() => { setLoading(true); fetchExperiences(); }}>Try again</Button>}
      />
    );
  } else if (experiences.length === 0) {
    content = (
      <EmptyState
        title="No experiences yet"
        description="Be the first brother to share an interview, internship, or research experience."
        action={<Button onClick={() => openForm()}>Share an experience</Button>}
      />
    );
  } else if (visible.length === 0) {
    content = <EmptyState title="Nothing here" description="No experiences match this filter yet." />;
  } else {
    content = (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((exp) => (
          <ExperienceCard
            key={exp._id}
            experience={exp}
            currentUserId={user?.id}
            onEdit={openForm}
            onDelete={setPendingDelete}
            onToggleBookmark={handleToggleBookmark}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Brothers helping brothers"
        title="Experiences"
        description="Interviews, internships, and research, written up by the brothers who went through them."
      >
        <Button variant="inverse" onClick={() => openForm()}>Share an experience</Button>
      </PageHeader>

      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        {notice && (
          <Notice tone={notice.tone} className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <span>{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)} className="text-xs uppercase tracking-[0.15em] opacity-70 hover:opacity-100">
                Dismiss
              </button>
            </div>
          </Notice>
        )}

        {!loading && !loadError && experiences.length > 0 && (
          <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-full px-4 py-2 font-display text-xs uppercase tracking-[0.15em] transition-colors ${
                  tab === t.key ? "bg-ink text-paper" : "border border-line bg-paper text-ink-soft hover:border-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {content}
      </section>

      <Modal open={formOpen} onClose={closeForm} title={editingId ? "Edit experience" : "Share an experience"} size="lg">
        <ExperienceForm
          form={form}
          setField={setField}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          submitting={submitting}
          editing={!!editingId}
          error={formError}
        />
      </Modal>

      <Modal open={!!pendingDelete} onClose={() => !deleting && setPendingDelete(null)} title="Delete experience">
        <div className="space-y-6 p-6">
          <p className="text-ink-soft">
            Delete your {pendingDelete?.role} experience at {pendingDelete?.company}? This can&apos;t be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setPendingDelete(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
