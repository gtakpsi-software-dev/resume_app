export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-[30px] border border-dashed border-line bg-paper px-6 py-16 text-center">
      <p className="font-display text-lg uppercase tracking-[0.08em] text-ink">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
