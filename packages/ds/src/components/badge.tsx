import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../cn";

const estilos = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tono: {
        neutro: "bg-bg text-fg-muted border border-border",
        success: "bg-success-muted text-success",
        warning: "bg-warning-muted text-warning-fg",
        danger: "bg-danger-muted text-danger",
        info: "bg-info-muted text-info",
        accent: "bg-accent-muted text-accent",
      },
    },
    defaultVariants: { tono: "neutro" },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof estilos>;

/** Estado de una entidad. El color significa estado, nunca decoración. */
export function Badge({ className, tono, ...props }: BadgeProps) {
  return <span className={cn(estilos({ tono }), className)} {...props} />;
}
