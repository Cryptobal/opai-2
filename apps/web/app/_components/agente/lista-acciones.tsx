"use client";

import { type ReactNode, useEffect, useState } from "react";

import { ListScreen } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { etiquetaCapacidad } from "@/app/(erp)/configuracion/auditoria/_componentes/capacidad";

type Accion = { capacidad: string; fecha: string };
const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );

/** Pestaña «Acciones» del historial: lo que el agente hizo en nombre de la persona (fecha y acción). */
export function ListaAcciones({ portal, pestanas }: { portal: string; pestanas: ReactNode }) {
  const [filas, setFilas] = useState<Accion[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    void ejecutarCapacidad(portal, "agente.historial.list", { limite: 50 })
      .then((r) => {
        if (!vivo) return;
        if (r.ok) setFilas(r.data as Accion[]);
        else setError(true);
      })
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [portal]);
  return (
    <ListScreen<Accion>
      state={filas === null ? (error ? "error" : "loading") : "ready"}
      titulo="Historial"
      filtros={pestanas}
      items={filas ?? []}
      clave={(a) => `${a.capacidad}|${a.fecha}`}
      textos={{
        vacio: {
          titulo: "Sin acciones todavía",
          descripcion: "Aquí verás lo que OPAI hizo por ti después de que lo confirmaste.",
        },
        error: { titulo: "No pudimos cargar las acciones" },
      }}
      tarjeta={(a) => (
        <span className="flex min-w-0 flex-col text-left">
          <span className="text-md truncate font-medium text-fg">
            {etiquetaCapacidad(a.capacidad)}
          </span>
          <span className="t-caption">{fecha(a.fecha)}</span>
        </span>
      )}
      columnas={[
        { id: "fecha", etiqueta: "Fecha", render: (a) => fecha(a.fecha) },
        { id: "accion", etiqueta: "Acción", render: (a) => etiquetaCapacidad(a.capacidad) },
      ]}
    />
  );
}
