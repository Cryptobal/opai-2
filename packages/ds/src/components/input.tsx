import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "../cn";

const base =
  "w-full min-h-11 rounded-md border border-border bg-surface px-3 text-base text-fg placeholder:text-fg-subtle outline-none focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/30 disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base, "appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}

type CampoProps = {
  etiqueta: string;
  htmlFor?: string;
  ayuda?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

/** Etiqueta + control + ayuda o error. */
export function Campo({ etiqueta, htmlFor, ayuda, error, children, className }: CampoProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : ayuda ? (
        <p className="text-sm text-fg-muted">{ayuda}</p>
      ) : null}
    </div>
  );
}
