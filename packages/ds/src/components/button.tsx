import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../cn";

const estilos = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md border border-transparent font-medium select-none",
    "whitespace-nowrap transition-colors duration-150 outline-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "disabled:pointer-events-none disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:brightness-95 active:brightness-90",
        secondary: "border-border-strong bg-surface text-fg hover:bg-fill",
        ghost: "text-fg hover:bg-fill",
        destructive: "bg-destructive text-destructive-fg hover:brightness-95",
      },
      size: {
        md: "h-11 px-4 text-base md:h-10",
        lg: "h-12 px-5 text-md",
        icon: "size-11",
        iconSm: "size-11 md:size-10",
      },
      block: { true: "flex w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

/** Clases del botón para enlaces que se ven como botón (navegación, no acción). */
export const estilosBoton = (variantes: VariantProps<typeof estilos> = {}): string =>
  cn(estilos(variantes));

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof estilos> & {
    /** En curso: deshabilitado, `aria-busy` y spinner; el botón conserva su ancho. */
    loading?: boolean;
  };

/** Botón del DS: md 40px, lg 48px (acciones principales en teléfono), icon 44px. */
export function Button({
  className,
  variant,
  size,
  block,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(estilos({ variant, size, block }), loading && "relative", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="contents invisible">{children}</span>
          <span
            aria-hidden
            className="absolute size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
          />
        </>
      ) : (
        children
      )}
    </button>
  );
}
