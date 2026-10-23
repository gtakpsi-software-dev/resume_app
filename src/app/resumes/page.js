"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { resumeAPI } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import ResumeCard from "@/components/resume/ResumeCard";
import FilterMenu from "@/components/search/FilterMenu";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Notice from "@/components/ui/Notice";
import Spinner from "@/components/ui/Spinner";

const FILTERS = [
  { key: "major", label: "Major", facet: "majors" },
  { key: "company", label: "Company", facet: "companies" },
  { key: "graduationYear", label: "Class", facet: "graduationYears" },
];

const STATUSES = [
  { value: "", label: "Everyone" },
  { value: "student", label: "Students" },
  { value: "alumni", label: "Alumni" },
];

const PAGE_SIZE = 24;
const emptyFacets = { majors: [], companies: [], graduationYears: [], status: { student: 0, alumni: 0 } };

function ResumesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const q = params.get("q") || "";
  const status = params.get("status") || "";
  const sort = params.get("sort") || "";
  const selected = useMemo(
    () => Object.fromEntries(FILTERS.map(({ key }) => [key, params.get(key)?.split(",").filter(Boolean) || []])),
    [params]
  );

  const [input, setInput] = useState(q);
  const [resumes, setResumes] = useState([]);
  const [facets, setFacets] = useState(emptyFacets);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      const str = Array.isArray(value) ? value.join(",") : value;
      if (str) next.set(key, str);
      else next.delete(key);
    });
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => setInput(q), [q]);

  useEffect(() => {
    if (input.trim() === q) return;
    const timer = setTimeout(() => update({ q: input.trim() }), 350);
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    resumeAPI
      .search(Object.fromEntries(params), { signal: controller.signal })
      .then(({ data }) => {
        setResumes(data.data || []);
        setFacets({ ...emptyFacets, ...data.facets });
        setVisible(PAGE_SIZE);
        setLoading(false);
      })
      .catch((err) => {
        if (err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Could not load resumes. Try again.");
        setResumes([]);
        setLoading(false);
      });
    return () => controller.abort();
  }, [params]);

  const active = FILTERS.flatMap(({ key }) => selected[key].map((value) => ({ key, value })));
  const hasFilters = active.length > 0 || status;
  const clearAll = () => update({ major: "", company: "", graduationYear: "", status: "" });

  return (
    <>
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-10 sm:px-8">
          <h1 className="font-display text-2xl uppercase tracking-[0.12em] sm:text-3xl">Resumes</h1>
          <div className="mt-6 flex items-center gap-3 rounded-full bg-paper px-5 text-ink">
            <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-muted" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Name, company, or describe who you need"
              aria-label="Search resumes"
              className="min-w-0 flex-1 bg-transparent py-4 placeholder:text-muted/70 focus:outline-none"
            />
            {input && (
              <button type="button" onClick={() => setInput("")} aria-label="Clear search" className="rounded-full p-1 text-muted hover:text-ink">
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-5 py-3 sm:overflow-visible sm:px-8">
          {FILTERS.map(({ key, label, facet }) => (
            <FilterMenu
              key={key}
              label={label}
              options={facets[facet] || []}
              selected={selected[key]}
              onChange={(values) => update({ [key]: values })}
            />
          ))}

          <div className="ml-1 flex shrink-0 rounded-full border border-line p-0.5">
            {STATUSES.map(({ value, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => update({ status: value })}
                aria-pressed={status === value}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                  status === value ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                {label}
                {value && <span className={`ml-1 ${status === value ? "text-paper/60" : "text-muted"}`}>{facets.status?.[value] ?? 0}</span>}
              </button>
            ))}
          </div>

          <select
            value={sort || (q ? "relevance" : "name")}
            onChange={(e) => update({ sort: e.target.value })}
            aria-label="Sort"
            className="ml-auto shrink-0 rounded-full border border-line bg-paper px-4 py-2 text-xs text-ink-soft focus:border-ink focus:outline-none"
          >
            {q && <option value="relevance">Best match</option>}
            <option value="name">Name</option>
            <option value="class">Class, newest</option>
          </select>
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
        <div className="mb-5 flex min-h-7 flex-wrap items-center gap-2 text-sm">
          {!loading && !error && (
            <span className="mr-2 text-muted">
              {resumes.length} {resumes.length === 1 ? "resume" : "resumes"}
              {q && ` for “${q}”`}
            </span>
          )}
          {active.map(({ key, value }) => (
            <button
              key={`${key}-${value}`}
              type="button"
              onClick={() => update({ [key]: selected[key].filter((v) => v !== value) })}
              className="flex items-center gap-1 rounded-full border border-ink px-3 py-1 text-xs text-ink hover:bg-ink hover:text-paper"
            >
              {value}
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          ))}
          {hasFilters && (
            <button type="button" onClick={clearAll} className="text-xs text-muted underline underline-offset-4 hover:text-ink">
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <Notice tone="error">{error}</Notice>
        ) : resumes.length === 0 ? (
          <EmptyState
            title="No resumes found"
            description={q ? "Try fewer words, a company name, or describe the experience instead." : "Try loosening your filters."}
            action={hasFilters && <Button variant="outline" size="sm" onClick={clearAll}>Clear filters</Button>}
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {resumes.slice(0, visible).map((resume) => (
                <ResumeCard key={resume.id} resume={resume} onDelete={(id) => setResumes((prev) => prev.filter((r) => r.id !== id))} />
              ))}
            </div>
            {visible < resumes.length && (
              <div className="mt-10 text-center">
                <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Show more
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

export default function Resumes() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<Spinner />}>
        <ResumesPage />
      </Suspense>
    </ProtectedRoute>
  );
}
