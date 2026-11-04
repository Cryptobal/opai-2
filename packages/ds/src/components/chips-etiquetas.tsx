"use client";

import { X } from "lucide-react";

import { cn } from "../cn";
import { Combobox } from "./combobox";

export type TonoEtiqueta = "neutral" | "info" | "success" | "warning" | "danger";

export type EtiquetaChip = { id: string; nombre: string; tono: TonoEtiqueta };

const TONO: Record<TonoEtiqueta, string> = {
  neutral: "bg-fill text-fg-muted",
  info: "bg-info-muted text-info-fg",
  success: "bg-success-muted text-success-fg",
  warning: "bg-warning-muted text-warning-fg",
  danger: "bg-danger-muted text-danger-fg",
};

type Props = {
  etiquetas: readonly EtiquetaChip[];
  /** Etiquetas del catálogo que aún se pueden agregar. Sin ellas (o sin `onAgregar`) no hay «+ Etiqueta». */
  disponibles?: readonly EtiquetaChip[];
  onAgregar?: (id: string) => void;
  /** Crear una etiqueta nueva con el texto escrito; solo con permiso de configurar el catálogo. */
  onCrear?: (nombre: string) => void;
  /** Con `onQuitar` cada chip lleva su «x». */
  onQuitar?: (id: string) => void;
  deshabilitado?: boolean;
  /** Solo lectura en una fila de lista: píldoras bajas, sin «x» ni «+ Etiqueta». */
  compacto?: boolean;
  /** Texto cuando no hay ninguna y no se puede agregar. */
  vacio?: string;
  className?: string;
};

/** Chips de etiquetas de una ficha: se quitan con la «x» y «+ Etiqueta» abre un combobox con búsqueda. */
export function ChipsEtiquetas(p: Props) {
  if (p.compacto) {
    return p.etiquetas.length ? (
      <span className={cn("flex flex-wrap gap-1", p.className)}>
        {p.etiquetas.slice(0, 3).map((e) => (
          <span
            key={e.id}
            className={cn("inline-flex h-5 items-center rounded-full px-2 text-xs font-medium", TONO[e.tono])}
          >
            {e.nombre}
          </span>
        ))}
        {p.etiquetas.length > 3 ? (
          <span className="inline-flex h-5 items-center text-xs text-fg-subtle">
            +{p.etiquetas.length - 3}
          </span>
        ) : null}
      </span>
    ) : null;
  }
  const puedeAgregar = Boolean(p.onAgregar && (p.disponibles?.length || p.onCrear));
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", p.className)}>
      {p.etiquetas.map((e) => (
        <span
          key={e.id}
          className={cn(
            "inline-flex h-11 items-center gap-1 rounded-full pl-3 text-sm font-medium whitespace-nowrap md:h-7",
            p.onQuitar ? "pr-1" : "pr-3",
            TONO[e.tono],
          )}
        >
          {e.nombre}
          {p.onQuitar ? (
            <button
              type="button"
              disabled={Boolean(p.deshabilitado)}
              onClick={() => p.onQuitar?.(e.id)}
              aria-label={`Quitar etiqueta ${e.nombre}`}
              className="flex size-11 items-center justify-center rounded-full hover:bg-fill md:size-6"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </span>
      ))}
      {!p.etiquetas.length && !puedeAgregar ? (
        <span className="t-caption">{p.vacio ?? "Sin etiquetas."}</span>
      ) : null}
      {puedeAgregar ? (
        <div className="w-44">
          <Combobox
            aria-label="Agregar etiqueta"
            placeholder="+ Etiqueta"
            buscarPlaceholder="Buscar etiqueta"
            disabled={Boolean(p.deshabilitado)}
            opciones={(p.disponibles ?? []).map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
            valor={null}
            onCambiar={([id]) => {
              if (id) p.onAgregar?.(id);
            }}
            {...(p.onCrear ? { onCrear: p.onCrear } : {})}
          />
        </div>
      ) : null}
    </div>
  );
}
