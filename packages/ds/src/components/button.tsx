import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
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
        destructive: "bg-destructive-bg text-destructive-fg hover:brightness-95",
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
    /** En curso: spinner, `aria-busy` y deshabilitado, con el mismo ancho (el texto queda invisible). */
    cargando?: boolean;
  };

/** Botón del DS: md 40px, lg 48px (acciones principales en teléfono), icon 44px. */
export function Button({
  className,
  variant,
  size,
  block,
  type = "button",
  cargando,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cn(
        estilos({ variant, size, block }),
        cargando && "relative disabled:opacity-100",
        className,
      )}
      {...props}
    >
      {cargando ? (
        <>
          <span className="invisible inline-flex items-center gap-2">{children}</span>
          <Loader2
            className="absolute size-4 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        </>
      ) : (
        children
      )}
    </button>
  );
}
