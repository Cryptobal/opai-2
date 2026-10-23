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
  return <h3 className={cn("text-md font-semibold text-fg", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-2", className)} {...props} />;
}

type KpiProps = {
  etiqueta: string;
  valor: string;
  variacion?: { texto: string; tono: "success" | "danger" | "neutro" };
};

/** Indicador de dashboard: sin color de fondo; el color solo en la variación. */
export function KpiTile({ etiqueta, valor, variacion }: KpiProps) {
  const tono =
    variacion?.tono === "success"
      ? "text-success"
      : variacion?.tono === "danger"
        ? "text-danger"
        : "text-fg-muted";
  return (
    <Card className="p-4">
      <p className="text-sm text-fg-muted">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-fg">{valor}</p>
      {variacion ? (
        <p className={cn("mt-1 text-sm tabular-nums", tono)}>{variacion.texto}</p>
      ) : null}
    </Card>
  );
}
