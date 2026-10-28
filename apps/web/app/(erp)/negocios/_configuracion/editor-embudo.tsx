"use client";

import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, SeccionTarjeta, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Etapa } from "../_componentes/hojas/tipos";
import { REQUISITO, TIPO_ETAPA } from "./etiquetas";

const HojaEtapa = dynamic(() => import("./hoja-etapa").then((m) => m.HojaEtapa));

/**
 * Etapas del embudo: orden, tipo, probabilidad, requisitos y activa. Reordenar con «Subir/Bajar»
 * (accesible, sin arrastre) aplica la lista completa con `comercial.config.reordenar_etapas`; la
 * ganada y la perdida quedan fijas al final y no se desactivan (R26).
 */
export function EditorEmbudo({ etapas }: { etapas: Etapa[] }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [editando, setEditando] = useState<Etapa | "nueva" | null>(null);
  const abiertas = etapas.filter((e) => e.tipo === "abierta");
  async function mover(i: number, delta: -1 | 1) {
    const ids = etapas.map((e) => e.id);
    const [a, b] = [ids[i], ids[i + delta]];
    if (!a || !b) return;
    ids[i] = b;
    ids[i + delta] = a;
    if (await ejecutar("comercial.config.reordenar_etapas", { ids }))
      avisar.exito("Orden guardado");
  }
  async function activar(e: Etapa, activa: boolean) {
    if (await ejecutar("comercial.config.actualizar_etapa", { id: e.id, activa }))
      avisar.exito(activa ? "Etapa activada" : "Etapa desactivada");
  }
  return (
    <SeccionTarjeta
      titulo="Etapas del embudo"
      sinRelleno
      accion={
        <Button variant="secondary" onClick={() => setEditando("nueva")}>
          <Plus className="size-4" aria-hidden />
          Agregar etapa
        </Button>
      }
    >
      <p className="t-caption px-4 pt-3">
        {etapas.length} etapas · {abiertas.length} abiertas y {etapas.length - abiertas.length} de
        cierre
      </p>
      {error ? <Alerta tono="danger" titulo={error} className="mx-4 mt-3" /> : null}
      <ol className="flex flex-col">
        {etapas.map((e, i) => {
          const fija = e.tipo !== "abierta";
          const tipo = TIPO_ETAPA[e.tipo];
          return (
            <li
              key={e.id}
              aria-label={e.nombre}
              className="flex flex-col gap-1 border-b border-border px-4 py-2 last:border-b-0 xl:flex-row xl:items-center xl:gap-3"
            >
              {/* Hasta xl (panel angosto en iPad): nombre arriba y controles abajo; luego una fila. */}
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="t-mono w-6 flex-none text-fg-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{e.nombre}</span>
                  <span className="t-caption truncate">
                    {e.probabilidad} %
                    {e.exige.length
                      ? ` · pide ${e.exige
                          .map((r) => REQUISITO[r] ?? r)
                          .join(", ")
                          .toLowerCase()}`
                      : ""}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-1 pl-9 xl:pl-0">
                <Badge tono={tipo.tono}>{tipo.etiqueta}</Badge>
                <span className="ml-auto flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Subir ${e.nombre}`}
                    disabled={pendiente || fija || i === 0}
                    onClick={() => void mover(i, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Bajar ${e.nombre}`}
                    disabled={pendiente || fija || i >= abiertas.length - 1}
                    onClick={() => void mover(i, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                  <Button variant="ghost" onClick={() => setEditando(e)}>
                    Editar
                  </Button>
                </span>
                <Switch
                  soloControl
                  etiqueta={`${e.nombre} activa`}
                  activo={fija || e.activa}
                  disabled={fija || pendiente}
                  onCambiar={(v) => void activar(e, v)}
                />
              </span>
            </li>
          );
        })}
      </ol>
      {editando ? (
        <HojaEtapa
          etapa={editando === "nueva" ? null : editando}
          posicion={abiertas.length}
          onCerrar={() => setEditando(null)}
        />
      ) : null}
    </SeccionTarjeta>
  );
}
