import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

import { cn } from "../cn";

const base =
  "w-full h-11 rounded-md border border-border-strong bg-surface px-3 text-md text-fg placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ds-accent-muted)] focus-visible:outline-none aria-invalid:border-danger-fg aria-invalid:shadow-[0_0_0_3px_var(--ds-danger-muted)] disabled:opacity-45";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "h-auto min-h-24 py-2.5", className)} {...props} />;
}

type CampoProps = {
  etiqueta: string;
  htmlFor?: string;
  ayuda?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

/** Etiqueta (14/20 500) + control + ayuda (12/16 subtle) o error (12/16 danger). */
export function Campo({ etiqueta, htmlFor, ayuda, error, children, className }: CampoProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="t-label text-fg">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger-fg">{error}</p>
      ) : ayuda ? (
        <p className="t-caption">{ayuda}</p>
      ) : null}
    </div>
  );
}
