"use client";

import type { ReactNode } from "react";

import { cn } from "../cn";
import { Chip } from "./chip";
import { Segmentado } from "./segmentado";

export type TipoCompositor = "nota" | "llamada" | "reunion" | "tarea";

export const TIPOS_COMPOSITOR: readonly { id: TipoCompositor; etiqueta: string }[] = [
  { id: "nota", etiqueta: "Nota" },
  { id: "llamada", etiqueta: "Llamada" },
  { id: "reunion", etiqueta: "Reunión" },
  { id: "tarea", etiqueta: "Tarea" },
];

type Props = {
  tipo: TipoCompositor;
  onTipo: (t: TipoCompositor) => void;
  /** Texto principal y campos propios del tipo (los arma quien usa el componente). */
  children: ReactNode;
  /** Fichas a las que queda ligada: chips con quitar. */
  vinculos: readonly { clave: string; etiqueta: string; valor: string; onQuitar?: () => void }[];
  /** Botón «Registrar» (con su estado de carga). */
  accion: ReactNode;
  /** Aviso de error de regla de negocio. */
  error?: ReactNode;
  /** Ayuda junto al tipo («Ocurrió el … · puedes cambiarla»). */
  ayuda?: ReactNode;
  className?: string;
};

/**
 * Registrar nota, llamada, reunión o tarea sobre una ficha (CRM v3, CAR-162). En escritorio va en
 * línea sobre la línea de tiempo; en teléfono, dentro de una hoja de pantalla completa.
 */
export function CompositorActividad(p: Props) {
  return (
    <section
      aria-label="Registrar actividad"
      className={cn("flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-4", p.className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado
          etiqueta="Tipo de actividad"
          activa={p.tipo}
          opciones={TIPOS_COMPOSITOR.map((t) => ({
            id: t.id,
            etiqueta: t.etiqueta,
            onClick: () => p.onTipo(t.id),
          }))}
          className="max-w-full overflow-x-auto"
        />
        {p.ayuda ? <span className="t-caption">{p.ayuda}</span> : null}
      </div>
      {p.error}
      <div className="flex flex-col gap-3">{p.children}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex min-w-0 flex-wrap gap-2" aria-label="Vinculada a">
          {p.vinculos.map((v) => (
            <Chip
              key={v.clave}
              etiqueta={v.etiqueta}
              valor={v.valor}
              {...(v.onQuitar ? { onQuitar: v.onQuitar } : {})}
            />
          ))}
        </div>
        {p.accion}
      </div>
    </section>
  );
}
