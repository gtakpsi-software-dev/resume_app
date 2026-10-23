const tones = {
  error: "border-danger/20 bg-danger/5 text-danger",
  success: "border-success/20 bg-success/5 text-success",
  info: "border-line bg-paper text-ink-soft",
};

export default function Notice({ tone = "info", children, className = "" }) {
  if (!children) return null;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}>
      {children}
    </div>
  );
}
