const socials = [
  { href: "https://www.instagram.com/gtakpsi/", label: "Instagram" },
  { href: "https://www.linkedin.com/company/gtakpsi/", label: "LinkedIn" },
  { href: "https://gtakpsi.org", label: "gtakpsi.org" },
];

export default function Footer() {
  return (
    <footer className="bg-ink text-paper/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm sm:flex-row sm:px-8">
        <p>
          <span className="font-display tracking-[0.1em] text-paper">ΑΚΨ</span> Epsilon Sigma Chapter, Georgia Tech
        </p>
        <div className="flex gap-6">
          {socials.map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="uppercase tracking-[0.15em] text-xs hover:text-paper">
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
