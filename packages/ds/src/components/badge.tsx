import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../cn";

const estilos = cva(
  [
    "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
    "before:size-1.5 before:rounded-full before:bg-current before:content-['']",
  ],
  {
    variants: {
      tono: {
        neutro: "bg-fill text-fg-muted",
        success: "bg-success-muted text-success-fg",
        warning: "bg-warning-muted text-warning-fg",
        danger: "bg-danger-muted text-danger-fg",
        info: "bg-info-muted text-info-fg",
        accent: "bg-accent-muted text-accent",
      },
      punto: { false: "before:hidden" },
    },
    defaultVariants: { tono: "neutro" },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof estilos>;

/** Estado de una entidad: píldora con punto. El color significa estado, nunca decoración. */
export function Badge({ className, tono, punto, ...props }: BadgeProps) {
  return <span className={cn(estilos({ tono, punto }), className)} {...props} />;
}
