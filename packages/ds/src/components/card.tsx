import type { HTMLAttributes } from "react";

import { cn } from "../cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-surface", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-start justify-between gap-3 p-4 pb-2", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("t-subheading text-fg", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-2", className)} {...props} />;
}

type KpiProps = {
  etiqueta: string;
  valor: string;
  variacion?: { texto: string; tono: "success" | "danger" | "warning" | "neutro" };
};

const TONO_VARIACION = {
  success: "text-success-fg",
  danger: "text-danger-fg",
  warning: "text-warning-fg",
  neutro: "text-fg-subtle",
} as const;

/** Indicador de dashboard: sin color de fondo; el color solo en la variación. */
export function KpiTile({ etiqueta, valor, variacion }: KpiProps) {
  return (
    <Card className="@container flex min-w-0 flex-col gap-1.5 p-4">
      <p className="t-label-sm text-fg-muted">{etiqueta}</p>
      <p className="t-numeric text-[clamp(18px,9cqw,22px)] leading-7 font-semibold tracking-[-0.015em] whitespace-nowrap text-fg">
        {valor}
      </p>
      {variacion ? (
        <p className={cn("t-numeric text-xs", TONO_VARIACION[variacion.tono])}>{variacion.texto}</p>
      ) : null}
    </Card>
  );
}
