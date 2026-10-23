import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../cn";

const estilos = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md font-medium select-none",
    "transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:opacity-50 disabled:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:opacity-90",
        secondary: "bg-surface text-fg border border-border hover:bg-bg",
        ghost: "text-fg hover:bg-accent-muted",
        destructive: "bg-danger text-danger-fg hover:opacity-90",
      },
      size: {
        md: "min-h-11 px-4 text-base",
        lg: "min-h-12 px-5 text-md",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof estilos>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(estilos({ variant, size }), className)} {...props} />;
}
