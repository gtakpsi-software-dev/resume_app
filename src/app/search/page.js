"use client";

import { useEffect, useMemo, useState } from "react";
import { AdjustmentsHorizontalIcon, MagnifyingGlassIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import api, { resumeAPI } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import ResumeCard from "@/components/resume/ResumeCard";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";

const FILTER_GROUPS = [
  { key: "major", label: "Major", source: "majors" },
  { key: "company", label: "Company", source: "companies" },
  { key: "graduationYear", label: "Graduation year", source: "graduationYears" },
  { key: "keyword", label: "Skills", source: "keywords" },
];

const emptyFilters = { major: [], company: [], graduationYear: [], keyword: [] };

function FilterGroup({ label, options, selected, onToggle }) {
  const [search, setSearch] = useState("");
  const visible = options.filter((o) => String(o).toLowerCase().includes(search.toLowerCase()));

  if (!options.length) return null;

  return (
    <div>
      <h3 className="mb-3 font-display text-xs uppercase tracking-[0.2em] text-muted">{label}</h3>
      {options.length > 6 && (
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Find ${label.toLowerCase()}`} className="mb-3 py-2 text-sm" />
      )}
      <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
        {visible.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft hover:text-ink">
            <input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} className="h-4 w-4 accent-ink" />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

function SearchPage() {
  const [mode, setMode] = useState("keyword");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [options, setOptions] = useState({ majors: [], companies: [], graduationYears: [], keywords: [] });
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const semantic = mode === "semantic";
  const awaitingPrompt = semantic && !query.trim();

  useEffect(() => {
    resumeAPI
      .getFilters()
      .then(({ data }) => data?.data && setOptions(data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (awaitingPrompt) {
      setResumes([]);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const request = semantic
          ? api.get("/resumes/vector-search", { params: { query }, signal: controller.signal })
          : api.get("/resumes/search", {
              params: {
                query: query || undefined,
                name: name || undefined,
                ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v.length).map(([k, v]) => [k, v.join(",")])),
              },
              signal: controller.signal,
            });
        const { data } = await request;
        setResumes(data.data || []);
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Could not load resumes. Try again.");
        setResumes([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [semantic, awaitingPrompt, query, name, filters]);

  const results = useMemo(
    () => (semantic ? resumes : [...resumes].sort((a, b) => (a.name || "").localeCompare(b.name || ""))),
    [resumes, semantic]
  );

  const activeFilters = Object.entries(filters).flatMap(([key, values]) => values.map((value) => ({ key, value })));
  const hasFilters = activeFilters.length > 0 || name;

  const toggleFilter = (key, value) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));

  const clearFilters = () => {
    setFilters(emptyFilters);
    setName("");
  };

  const modeButton = (value, label, Icon) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      className={`flex items-center gap-2 rounded-full px-5 py-2 font-display text-xs uppercase tracking-[0.18em] transition-colors ${
        mode === value ? "bg-paper text-ink" : "text-paper/70 hover:text-paper"
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </button>
  );

  return (
    <>
      <PageHeader title="Resumes" description="Search the chapter's resume book by name, major, company, or skill.">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="inline-flex rounded-full border border-paper/30 p-1">
            {modeButton("keyword", "Keyword")}
            {modeButton("semantic", "AI search", SparklesIcon)}
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={semantic ? "Describe who you're looking for, e.g. CS major with AWS experience" : "Search name, major, company, or skill"}
              className="w-full rounded-full bg-paper py-4 pl-13 pr-5 text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-paper/40"
              aria-label="Search resumes"
            />
          </div>
        </div>
      </PageHeader>

      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside>
            <button
              type="button"
              onClick={() => setShowFilters((open) => !open)}
              className="mb-4 flex w-full items-center justify-between rounded-full border border-line bg-paper px-5 py-3 font-display text-xs uppercase tracking-[0.18em] lg:hidden"
              aria-expanded={showFilters}
            >
              <span className="flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                Filters{activeFilters.length > 0 && ` (${activeFilters.length})`}
              </span>
              <span>{showFilters ? "Hide" : "Show"}</span>
            </button>

            <div className={`${showFilters ? "block" : "hidden"} lg:block`}>
              <div className={`space-y-7 rounded-[30px] border border-line bg-paper p-6 ${semantic ? "pointer-events-none opacity-50" : ""}`}>
                {semantic && <p className="text-xs text-muted">Filters apply to keyword search only.</p>}
                <div>
                  <h3 className="mb-3 font-display text-xs uppercase tracking-[0.2em] text-muted">Name</h3>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Any name" className="py-2 text-sm" />
                </div>
                {FILTER_GROUPS.map((group) => (
                  <FilterGroup
                    key={group.key}
                    label={group.label}
                    options={(options[group.source] || []).filter((o) => o && o !== "Unspecified")}
                    selected={filters[group.key]}
                    onToggle={(value) => toggleFilter(group.key, value)}
                  />
                ))}
              </div>
            </div>
          </aside>

          <div>
            <div className="mb-5 flex min-h-8 flex-wrap items-center gap-2">
              {!loading && !awaitingPrompt && !error && (
                <p className="mr-2 text-sm text-muted">
                  {results.length} {semantic ? (results.length === 1 ? "match" : "matches") : results.length === 1 ? "resume" : "resumes"}
                </p>
              )}
              {!semantic &&
                activeFilters.map(({ key, value }) => (
                  <button
                    key={`${key}-${value}`}
                    type="button"
                    onClick={() => toggleFilter(key, value)}
                    className="flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs text-paper hover:bg-ink-deep"
                  >
                    {value}
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                ))}
              {!semantic && hasFilters && (
                <button type="button" onClick={clearFilters} className="text-xs text-muted underline underline-offset-4 hover:text-ink">
                  Clear all
                </button>
              )}
            </div>

            {awaitingPrompt ? (
              <EmptyState
                title="Describe who you're looking for"
                description="AI search matches the meaning of your description against every resume, e.g. “consulting internship and data analytics”."
              />
            ) : loading ? (
              <Spinner />
            ) : error ? (
              <Notice tone="error">{error}</Notice>
            ) : results.length === 0 ? (
              <EmptyState
                title="No resumes found"
                description="Try a different search or loosen your filters."
                action={!semantic && hasFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((resume) => (
                  <ResumeCard key={resume.id} resume={resume} onDelete={(id) => setResumes((prev) => prev.filter((r) => r.id !== id))} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default function Search() {
  return (
    <ProtectedRoute>
      <SearchPage />
    </ProtectedRoute>
  );
}
