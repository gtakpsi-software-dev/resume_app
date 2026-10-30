export default function PageHeader({ eyebrow, title, description, children }) {
  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20 text-center">
        {eyebrow && <p className="mb-3 text-xs uppercase tracking-[0.3em] text-paper/60">{eyebrow}</p>}
        <h1 className="font-display text-3xl uppercase tracking-[0.06em] sm:text-5xl">{title}</h1>
        {description && <p className="mx-auto mt-4 max-w-2xl text-paper/75 sm:text-lg">{description}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
