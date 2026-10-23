"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const examples = ["Deloitte", "Computer Science 2027", "consulting with Python"];

export default function SearchLanding() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const search = (value) => {
    const q = value.trim();
    router.push(q ? `/resumes?q=${encodeURIComponent(q)}` : "/resumes");
  };

  return (
    <section className="flex flex-1 items-center bg-ink text-paper">
      <div className="mx-auto w-full max-w-3xl px-5 py-24 text-center sm:px-8">
        <h1 className="font-display text-3xl uppercase tracking-[0.12em] sm:text-5xl">Find a brother</h1>
        <p className="mt-4 text-paper/70">Search every resume in the chapter by name, company, major, or what they have done.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
          className="mx-auto mt-10 flex max-w-2xl items-center gap-2 rounded-full bg-paper p-2 pl-5 text-ink shadow-2xl"
        >
          <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, company, or describe who you need"
            aria-label="Search resumes"
            autoFocus
            className="min-w-0 flex-1 bg-transparent py-2 placeholder:text-muted/70 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-ink px-6 py-3 font-display text-xs uppercase tracking-[0.18em] text-paper hover:bg-ink-deep"
          >
            Search
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-paper/60">
          <span>Try</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => search(example)}
              className="rounded-full border border-paper/25 px-3 py-1 text-paper/80 hover:border-paper hover:text-paper"
            >
              {example}
            </button>
          ))}
        </div>

        <Link
          href="/resumes"
          className="mt-10 inline-block font-display text-xs uppercase tracking-[0.2em] text-paper/80 underline underline-offset-8 hover:text-paper"
        >
          View all resumes &rarr;
        </Link>
      </div>
    </section>
  );
}
