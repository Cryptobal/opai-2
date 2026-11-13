import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "../cn";

export function Table({
  className,
  etiqueta = "Tabla",
  ...props
}: HTMLAttributes<HTMLTableElement> & {
  /** Nombre de la zona desplazable para el lector de pantalla (por defecto «Tabla»). */
  etiqueta?: string;
}) {
  return (
    // Marco Hilo (ADR-090): sin tarjeta; las filas se separan con una línea sobre el fondo del lienzo.
    // La zona desplazable se alcanza con el teclado aunque la tabla no tenga enlaces (WCAG 2.1.1,
    // axe `scrollable-region-focusable`; CAR-364).
    <div
      role="region"
      aria-label={etiqueta}
      tabIndex={0}
      className="w-full overflow-x-auto rounded-lg border border-border bg-surface outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus marco-hilo:rounded-none marco-hilo:border-0 marco-hilo:bg-transparent"
    >
      <table
        className={cn("w-full border-separate border-spacing-0 text-base", className)}
        {...props}
      />
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 border-b border-border bg-surface px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap text-fg-subtle",
        "marco-hilo:bg-(--fondo) marco-hilo:font-semibold marco-hilo:tracking-[0.06em] marco-hilo:text-fg-muted marco-hilo:uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "h-12 border-b border-border px-3 whitespace-nowrap text-fg [tr:last-child_&]:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("transition-colors hover:bg-fill dark:hover:bg-bg", className)} {...props} />
  );
}
