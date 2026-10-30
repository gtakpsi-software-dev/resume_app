import Link from "next/link";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-display uppercase tracking-[0.12em] transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const variants = {
  primary: "bg-ink text-paper hover:bg-ink-deep",
  outline: "border border-ink text-ink hover:bg-ink hover:text-paper",
  light: "border border-paper/80 text-paper hover:bg-paper hover:text-ink",
  inverse: "bg-paper text-ink hover:bg-paper/90",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-danger text-paper hover:bg-danger/90",
};

const sizes = {
  sm: "text-xs px-4 py-2",
  md: "text-sm px-6 py-3",
  lg: "text-base px-8 py-4",
};

export function buttonClass({ variant = "primary", size = "md", className = "" } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

export default function Button({ href, variant, size, className, ...props }) {
  const classes = buttonClass({ variant, size, className });
  if (href) {
    return <Link href={href} className={classes} {...props} />;
  }
  return <button type="button" className={classes} {...props} />;
}
