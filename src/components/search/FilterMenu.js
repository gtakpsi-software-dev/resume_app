"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export default function FilterMenu({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (value) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const visible = options.filter((o) => o.value.toLowerCase().includes(search.toLowerCase()));
  const active = selected.length > 0;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setSearch("");
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 font-display text-xs uppercase tracking-[0.15em] transition-colors ${
          active ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink hover:border-ink"
        }`}
      >
        {label}
        {active && <span className="text-paper/70">· {selected.length}</span>}
        <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-ink-deep/40 sm:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] rounded-t-[30px] border border-line bg-paper p-4 shadow-2xl sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-72 sm:rounded-[24px]">
            <p className="mb-3 px-1 font-display text-xs uppercase tracking-[0.2em] text-muted sm:hidden">{label}</p>
            {options.length > 8 && (
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Find ${label.toLowerCase()}`}
                autoFocus
                className="mb-2 w-full rounded-xl border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            )}
            <div className="max-h-72 overflow-y-auto">
              {visible.length === 0 && <p className="px-1 py-3 text-sm text-muted">No matches</p>}
              {visible.map(({ value, count }) => {
                const checked = selected.includes(value);
                return (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-mist ${
                      !count && !checked ? "text-muted/60" : "text-ink"
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(value)} className="h-4 w-4 accent-ink" />
                    <span className="flex-1 truncate">{value}</span>
                    <span className="text-xs text-muted">{count}</span>
                  </label>
                );
              })}
            </div>
            {active && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="mt-2 w-full rounded-full py-2 text-xs text-muted underline underline-offset-4 hover:text-ink"
              >
                Clear {label.toLowerCase()}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
