"use client";

import { type ReactNode, useEffect, useState } from "react";

import { Badge, ListScreen } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { etiquetaCapacidad } from "@/app/(erp)/configuracion/auditoria/_componentes/capacidad";

type Entidad = { tipo: string; id: string; etiqueta: string | null };
type Resultado = "ok" | "error" | "pendiente" | "rechazado" | "vencido";
type Accion = { capacidad: string; fecha: string; resultado: Resultado; entidad: Entidad | null };

const RESULTADO = {
  ok: ["Hecho", "success"],
  error: ["Falló", "danger"],
  pendiente: ["En aprobación", "warning"],
  rechazado: ["Rechazado", "neutro"],
  vencido: ["Vencido", "neutro"],
} as const;
const TIPO: Record<string, string> = {
  cuenta: "Cuenta",
  instalacion: "Instalación",
  persona: "Persona",
};
const entidad = (e: Entidad | null) =>
  e ? [TIPO[e.tipo] ?? "Registro", e.etiqueta].filter(Boolean).join(" · ") : "—";
const EstadoAccion = ({ r }: { r: Resultado }) => (
  <Badge tono={RESULTADO[r][1]}>{RESULTADO[r][0]}</Badge>
);
const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );

/** Pestaña «Acciones» del historial: lo que el agente hizo en nombre de la persona (fecha, acción, entidad afectada y resultado). */
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
          <span className="t-caption truncate">{entidad(a.entidad)}</span>
          <span className="t-caption">{fecha(a.fecha)}</span>
          <span className="mt-1">
            <EstadoAccion r={a.resultado} />
          </span>
        </span>
      )}
      columnas={[
        { id: "fecha", etiqueta: "Fecha", render: (a) => fecha(a.fecha) },
        { id: "accion", etiqueta: "Acción", render: (a) => etiquetaCapacidad(a.capacidad) },
        { id: "entidad", etiqueta: "Entidad", render: (a) => entidad(a.entidad) },
        { id: "resultado", etiqueta: "Resultado", render: (a) => <EstadoAccion r={a.resultado} /> },
      ]}
    />
  );
}
