export default function Tag({ children, tone = "light" }) {
  const styles = tone === "dark" ? "bg-ink text-paper" : "bg-mist text-ink-soft border border-line";
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${styles}`}>{children}</span>;
}
