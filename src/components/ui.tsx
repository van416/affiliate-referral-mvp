import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export const primaryLinkClass =
  "inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep";

export const secondaryLinkClass =
  "inline-flex items-center justify-center rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium text-ink hover:bg-white";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-2xl border border-line bg-card p-5 shadow-sm ${className}`}>{children}</section>;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const variantClass =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-deep"
      : "border border-line bg-card text-ink hover:bg-white";
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClass} ${className}`}
      {...props}
    />
  );
}

export function TextField({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = props.id || props.name;
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="mb-1.5 block font-medium">{label}</span>
      <input
        id={id}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none ring-accent/30 placeholder:text-muted/70 focus:border-accent focus:ring-2"
        {...props}
      />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Notice({ tone, children }: { tone: "error" | "ok" | "info"; children: ReactNode }) {
  const toneClass = {
    error: "border-rose-200 bg-rose-50 text-rose-900",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-950",
    info: "border-teal-200 bg-accent-soft text-accent-deep",
  }[tone];
  return <p className={`rounded-lg border px-3 py-2 text-sm ${toneClass}`}>{children}</p>;
}
