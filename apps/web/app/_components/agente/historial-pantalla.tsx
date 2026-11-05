"use client";

import { useState } from "react";

import { Input, ListScreen, Segmentado } from "@opai/ds";

import { abrirAgente } from "./abrir-agente";
import { AccionesConversacion } from "./acciones-conversacion";
import { ListaAcciones } from "./lista-acciones";
import { type Resumen, useHistorial } from "./use-historial";

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
type Pestana = "conversaciones" | "archivadas" | "acciones";
const recortar = (t: string) => (t.length > 40 ? `${t.slice(0, 40)}…` : t);

/** `/agente/historial` (ListScreen): conversaciones propias con buscar, abrir y administrar, más las acciones. */
export function HistorialPantalla({ portal }: { portal: string }) {
  const [pestana, setPestana] = useState<Pestana>("conversaciones");
  const [q, setQ] = useState("");
  const h = useHistorial(portal, pestana !== "acciones", pestana === "archivadas", q);
  const pestanas = (
    <Segmentado
      etiqueta="Qué ver"
      activa={pestana}
      opciones={(
        [
          ["conversaciones", "Conversaciones"],
          ["archivadas", "Archivadas"],
          ["acciones", "Acciones"],
        ] as const
      ).map(([id, etiqueta]) => ({ id, etiqueta, onClick: () => setPestana(id) }))}
    />
  );
  if (pestana === "acciones") return <ListaAcciones portal={portal} pestanas={pestanas} />;
  const estado = h.lista === null ? (h.error ? "error" : "loading") : "ready";
  return (
    <ListScreen<Resumen>
      state={estado}
      titulo="Historial"
      subtitulo="Solo tú ves tus conversaciones con OPAI. Se borran solas tras el plazo de retención."
      buscador={
        <Input
          type="search"
          aria-label="Buscar en mis conversaciones"
          maxLength={120}
          placeholder="Buscar conversaciones"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      }
      filtros={pestanas}
      items={h.lista ?? []}
      clave={(c) => c.id}
      onSeleccionar={(c) => abrirAgente({ conversacionId: c.id })}
      textos={{
        vacio: h.buscado
          ? {
              titulo: `Sin resultados para “${recortar(h.buscado)}”`,
              descripcion: "Prueba con otra palabra del título.",
            }
          : {
              titulo:
                pestana === "archivadas" ? "No hay archivadas" : "Aún no tienes conversaciones",
              descripcion: "Tus conversaciones con OPAI se guardan aquí, solo para ti.",
            },
        error: { titulo: "No pudimos cargar tus conversaciones", descripcion: h.error ?? "" },
      }}
      tarjeta={(c) => (
        <span className="flex min-w-0 flex-col text-left">
          <span className="text-md truncate font-medium text-fg">{c.titulo}</span>
          <span className="t-caption">
            {fecha(c.ultimaActividad)} · {c.mensajes} mensajes
          </span>
        </span>
      )}
      columnas={[
        {
          id: "titulo",
          etiqueta: "Conversación",
          render: (c) => <span className="font-medium">{c.titulo}</span>,
        },
        { id: "fecha", etiqueta: "Última actividad", render: (c) => fecha(c.ultimaActividad) },
        { id: "n", etiqueta: "Mensajes", render: (c) => c.mensajes, className: "text-right" },
        {
          id: "acciones",
          etiqueta: "Acciones",
          className: "w-14",
          render: (c) => (
            <AccionesConversacion
              titulo={c.titulo}
              archivada={pestana === "archivadas"}
              onRenombrar={(t) => h.renombrar(c.id, t)}
              onArchivar={(a) => h.archivar(c.id, a)}
              onBorrar={() => h.borrar(c.id)}
            />
          ),
        },
      ]}
    />
  );
}
