import { Building2, FileText, Landmark, Users } from "lucide-react";
import type { ComponentType } from "react";

import { Skeleton } from "@opai/ds";

import { fecha } from "@/lib/fechas";

/** Lo que devuelve `comercial.negocios.ganar` en `efectos` (vista previa y resultado). */
export type EfectosGanar = {
  cuenta: { id: string; nombre: string; desde: string; hacia: "cliente_activo" } | null;
  instalaciones: { id: string; nombre: string; desde: string }[];
  cotizacion: { id: string; versionId: string; codigo: string; version: number } | null;
  rechazadas: number;
  puestosPorOfrecer: number;
};

type Fila = { icono: ComponentType<{ className?: string }>; t: string; d: string };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Textos de la vista previa (GanarNegocio, diseño CRM v3 cierre §3.6). */
export function filasEfectos(e: EfectosGanar, inicio: string | null): Fila[] {
  const filas: Fila[] = [];
  if (e.cuenta)
    filas.push({
      icono: Landmark,
      t: "La cuenta pasa a Cliente activo",
      d: `${e.cuenta.nombre} deja de ser ${e.cuenta.desde === "prospecto" ? "prospecto" : "cliente inactivo"}`,
    });
  if (e.instalaciones.length)
    filas.push({
      icono: Building2,
      t: `Se ${e.instalaciones.length === 1 ? "activa" : "activan"} ${plural(e.instalaciones.length, "instalación", "instalaciones")}: ${e.instalaciones.map((i) => i.nombre).join(", ")}`,
      d: inicio ? `Llegan a Operaciones desde el ${fecha(inicio)}` : "Llegan a Operaciones",
    });
  if (e.cotizacion)
    filas.push({
      icono: FileText,
      t: `La cotización ${e.cotizacion.codigo} v${e.cotizacion.version} queda aceptada`,
      d: e.rechazadas
        ? `${plural(e.rechazadas, "versión abierta pasa", "versiones abiertas pasan")} a rechazada`
        : "No hay otras versiones abiertas",
    });
  if (e.puestosPorOfrecer)
    filas.push({
      icono: Users,
      t: `Se ofrecerán ${plural(e.puestosPorOfrecer, "puesto", "puestos")} a RRHH`,
      d: "RRHH confirma cada puesto antes de crearlo",
    });
  return filas;
}

/** «Qué va a pasar»: efectos de ganar, con skeleton mientras llega la vista previa. */
export function EfectosGanarLista(p: { efectos: EfectosGanar | null; inicio: string | null }) {
  if (!p.efectos)
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  const filas = filasEfectos(p.efectos, p.inicio);
  return (
    <section className="flex flex-col gap-2" aria-label="Qué va a pasar">
      <h3 className="t-label">Qué va a pasar</h3>
      {filas.length ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {filas.map((f) => (
            <li key={f.t} className="flex gap-3 p-3">
              <f.icono className="mt-0.5 size-4 flex-none text-fg-muted" aria-hidden />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="t-body-sm font-medium">{f.t}</span>
                <span className="t-caption">{f.d}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-body-sm text-fg-muted">
          Solo cambia el negocio: la cuenta y las instalaciones ya están activas.
        </p>
      )}
      <p className="t-caption">
        Vista previa: nada cambia hasta que confirmes. Si un agente lo pide, queda esperando tu
        aprobación.
      </p>
    </section>
  );
}
