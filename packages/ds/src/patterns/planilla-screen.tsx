"use client";

import { useState, type ReactNode } from "react";

import { cn } from "../cn";
import { Cabecera, Estado, type EstadoPantalla, type TextosEstado } from "./estado";

export type TonoCelda = "neutro" | "success" | "warning" | "danger" | "info" | "accent";
export type Celda = { texto: string; tono?: TonoCelda; detalle?: string };
export type FilaPlanilla = { id: string; etiqueta: string; sub?: string };
export type ColumnaPlanilla = { id: string; etiqueta: string; destacada?: boolean };

export type PlanillaScreenProps = {
  state: EstadoPantalla;
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  filas: readonly FilaPlanilla[];
  columnas: readonly ColumnaPlanilla[];
  celda: (filaId: string, columnaId: string) => Celda | null;
  textos?: TextosEstado;
  /** Si se define, se invoca al tocar una celda (además del zoom en móvil). */
  onCelda?: (filaId: string, columnaId: string) => void;
};

/* Códigos de turno del diseño: D info, N acento, L libre (sin fondo), V success, X danger (sin cubrir). */
const TONO: Record<TonoCelda, string> = {
  neutro: "bg-transparent text-fg-subtle font-normal",
  success: "bg-success-muted text-success-fg",
  warning: "bg-warning-muted text-warning-fg",
  danger: "bg-danger-muted text-danger-fg shadow-[inset_0_0_0_1px_var(--ds-danger)]",
  info: "bg-info-muted text-info-fg",
  accent: "bg-accent-muted text-accent",
};

/**
 * Planilla: grilla con cabeceras de fila y columna fijas y scroll interno.
 * En teléfono, tocar una celda la amplía en la barra inferior (zoom de celda).
 */
export function PlanillaScreen({
  state,
  titulo,
  subtitulo,
  acciones,
  filas,
  columnas,
  celda,
  textos,
  onCelda,
}: PlanillaScreenProps) {
  const [seleccion, setSeleccion] = useState<{
    fila: FilaPlanilla;
    columna: ColumnaPlanilla;
    celda: Celda;
  } | null>(null);
  const vacio = state === "ready" && filas.length === 0 ? "empty" : state;
  return (
    <section>
      <Cabecera
        titulo={titulo}
        {...(subtitulo ? { subtitulo } : {})}
        {...(acciones ? { acciones } : {})}
      />
      <Estado state={vacio} variante="planilla" {...(textos ? { textos } : {})}>
        <div className="max-h-[70dvh] overflow-auto rounded-lg border border-border bg-surface">
          <table className="border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 min-w-40 border-r border-b border-border bg-surface px-3 py-2 text-left text-xs font-medium text-fg-subtle">
                  &nbsp;
                </th>
                {columnas.map((c) => (
                  <th
                    key={c.id}
                    className={cn(
                      "t-numeric sticky top-0 z-10 min-w-10 border-b border-border bg-surface px-1 py-2 text-center text-xs",
                      c.destacada ? "text-accent" : "text-fg-subtle",
                    )}
                  >
                    {c.etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <th className="sticky left-0 z-10 border-r border-b border-border bg-surface px-3 py-1.5 text-left text-base font-medium text-fg">
                    <div className="truncate">{f.etiqueta}</div>
                    {f.sub ? (
                      <div className="text-xs font-normal text-fg-muted">{f.sub}</div>
                    ) : null}
                  </th>
                  {columnas.map((c) => {
                    const valor = celda(f.id, c.id);
                    return (
                      <td key={c.id} className="border-b border-border p-0.5">
                        {valor ? (
                          <button
                            type="button"
                            onClick={() => {
                              onCelda?.(f.id, c.id);
                              setSeleccion({ fila: f, columna: c, celda: valor });
                            }}
                            className={cn(
                              "flex min-h-9 w-full min-w-9 items-center justify-center rounded-sm text-xs font-medium",
                              TONO[valor.tono ?? "neutro"],
                            )}
                          >
                            {valor.texto}
                          </button>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {seleccion ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-base">
            <div>
              <span className="font-medium text-fg">{seleccion.fila.etiqueta}</span>
              <span className="text-fg-muted"> · {seleccion.columna.etiqueta} · </span>
              <span
                className={cn(
                  "rounded-sm px-1.5 py-0.5 text-sm",
                  TONO[seleccion.celda.tono ?? "neutro"],
                )}
              >
                {seleccion.celda.texto}
              </span>
              {seleccion.celda.detalle ? (
                <span className="text-fg-muted"> · {seleccion.celda.detalle}</span>
              ) : null}
            </div>
            <button
              type="button"
              className="min-h-11 px-2 text-sm text-fg-muted"
              onClick={() => setSeleccion(null)}
            >
              Cerrar
            </button>
          </div>
        ) : null}
      </Estado>
    </section>
  );
}
