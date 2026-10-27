import { Bot } from "lucide-react";

import type { Aprobacion } from "@/app/(erp)/configuracion/aprobaciones/tipos";
import { quien, RIESGO } from "@/app/(erp)/configuracion/aprobaciones/tipos";
import { haceCuanto } from "@/lib/fechas";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { EnlaceBoton } from "../maestros/enlace-boton";
import { AccionesBanda } from "./acciones-banda";

type Props = {
  aprobaciones?: Aprobacion[];
  entidad: { tipo: "cuenta" | "instalacion" | "persona"; id: string };
};

/**
 * Banda "Propuesto por agente" (45) sobre una ficha con acciones de agentes pendientes sobre esa
 * entidad. Sin permiso de aprobaciones no se muestra.
 */
export async function BandaAprobacion({ entidad, aprobaciones }: Props) {
  const r = aprobaciones
    ? { ok: true, data: aprobaciones }
    : await ejecutarComoUsuario<Aprobacion[]>("erp", "core.aprobaciones.list", {
        estado: "pendiente",
        entidad,
        limite: 5,
      });
  if (!r.ok || r.data.length === 0) return null;
  return (
    <div className="mb-4 flex flex-col gap-2">
      {r.data.map((a) => (
        <section
          key={a.id}
          aria-label="Acción propuesta por un agente"
          className="flex flex-col gap-3 rounded-lg border border-accent bg-accent-muted p-4 xl:flex-row xl:items-center"
        >
          <Bot className="size-5 flex-none text-accent max-xl:hidden" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-base font-semibold text-fg">Propuesto por agente · {quien(a)}</p>
            <p className="t-caption">
              {a.resumen} · {RIESGO[a.riesgo].etiqueta.toLowerCase()} · {haceCuanto(a.creadaEn)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EnlaceBoton href={`/configuracion/aprobaciones?ver=${a.id}`} variante="ghost">
              Ver en la bandeja
            </EnlaceBoton>
            <AccionesBanda id={a.id} />
          </div>
        </section>
      ))}
    </div>
  );
}
