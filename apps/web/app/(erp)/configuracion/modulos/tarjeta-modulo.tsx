import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@opai/ds";

type Tono = "success" | "info" | "warning" | "neutro";
export const ESTADO_MODULO: Record<string, { etiqueta: string; tono: Tono }> = {
  activo: { etiqueta: "Activo", tono: "success" },
  trial: { etiqueta: "En trial", tono: "info" },
  suspendido: { etiqueta: "Suspendido", tono: "warning" },
};

type Props = {
  nombre: string;
  estado: string | null | "siempre";
  funciones: string[];
  pie: ReactNode;
  accion?: ReactNode;
  /** Precio de lista y estado de la prueba gratis. */
  detalle?: ReactNode;
};

/** Tarjeta de un módulo (42/43): nombre, estado, funciones como chips, versión y dependencias. */
export function TarjetaModulo({ nombre, estado, funciones, pie, accion, detalle }: Props) {
  const e = estado && estado !== "siempre" ? ESTADO_MODULO[estado] : null;
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-md font-semibold text-fg">{nombre}</h3>
        {estado === "siempre" ? (
          <Badge punto={false}>
            <Lock className="size-3" aria-hidden /> Siempre activo
          </Badge>
        ) : e ? (
          <Badge tono={e.tono}>{e.etiqueta}</Badge>
        ) : (
          <Badge>No contratado</Badge>
        )}
      </header>
      {funciones.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {funciones.map((f) => (
            <li key={f} className="rounded-sm bg-fill px-2 py-0.5 text-sm text-fg-muted">
              {f}
            </li>
          ))}
        </ul>
      ) : null}
      {detalle}
      <div className="mt-auto flex items-end justify-between gap-3">
        <p className="t-caption">{pie}</p>
        {accion}
      </div>
    </article>
  );
}
