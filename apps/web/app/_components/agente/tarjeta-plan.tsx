"use client";

import { Check, CircleDashed, Loader2, TriangleAlert, X } from "lucide-react";

import { Badge, Button } from "@opai/ds";

import { etiquetaCapacidad } from "../../(erp)/configuracion/auditoria/_componentes/capacidad";

import { ESTADO_PLAN_TEXTO } from "./mensajes-error";
import type { PlanVista } from "./tipos";
import { VistaPrevia } from "./vista-previa";

/** Minutos que le quedan al plan; se calcula al pintar la tarjeta, no en el estado. */
function minutosRestantes(vence: number): number {
  return Math.max(0, Math.round((vence - Date.now()) / 60_000));
}

type EstadoPaso = "hecho" | "fallo" | "aprobacion" | "actual" | "pendiente" | "omitido";

function estadoDe(plan: PlanVista, i: number): EstadoPaso {
  const r = plan.resultados.find((x) => x.paso === i);
  if (r?.ok) return "hecho";
  if (r) return r.code === "APPROVAL_REQUIRED" ? "aprobacion" : "fallo";
  if (plan.estado === "fallido" || plan.estado === "aprobacion" || plan.estado === "rechazado")
    return "omitido";
  return i === plan.siguiente || plan.nivel === "aprobar_todo" ? "actual" : "pendiente";
}

const ETIQUETA = {
  hecho: ["Hecho", "success"],
  fallo: ["Falló", "danger"],
  aprobacion: ["En aprobación", "warning"],
  actual: ["Por confirmar", "info"],
  pendiente: ["Pendiente", "neutro"],
  omitido: ["No se ejecutó", "neutro"],
} as const;

/** Plan de escrituras del agente (spec agente §3.4): vista previa por paso y confirmación humana. */
export function TarjetaPlan({
  plan,
  onDecidir,
}: {
  plan: PlanVista;
  onDecidir: (aceptar: boolean) => void;
}) {
  const activo = plan.estado === "propuesto" || plan.estado === "en_curso";
  const ejecutando = plan.estado === "ejecutando";
  const cerrado = plan.estado in ESTADO_PLAN_TEXTO;
  const todo = plan.nivel === "aprobar_todo";
  return (
    <section
      aria-label={`Plan de ${plan.pasos.length} cambios`}
      className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="t-label-sm text-fg">
          Plan · {plan.pasos.length} {plan.pasos.length === 1 ? "cambio" : "cambios"}
        </h3>
        <span className="t-caption">
          {todo ? "Aprobar todo" : "Paso a paso"}
          {activo ? ` · vence en ${minutosRestantes(plan.vence)} min` : ""}
        </span>
      </header>
      <ol className="flex flex-col gap-2">
        {plan.pasos.map((p, i) => {
          const e = estadoDe(plan, i);
          const [texto, tono] = ETIQUETA[e];
          return (
            <li key={p.clave} className={e === "pendiente" || e === "omitido" ? "opacity-60" : ""}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-md font-medium text-fg">
                  {etiquetaCapacidad(p.capacidad)}
                </span>
                <Badge tono={tono}>{texto}</Badge>
              </div>
              {e === "actual" || e === "pendiente" ? (
                <VistaPrevia datos={p.vistaPrevia.data} />
              ) : null}
            </li>
          );
        })}
      </ol>
      {cerrado ? (
        <p className="t-caption flex items-center gap-1.5" role="status">
          {plan.estado === "completo" ? (
            <Check className="size-4 text-success-fg" aria-hidden />
          ) : (
            <TriangleAlert className="size-4 text-warning-fg" aria-hidden />
          )}
          {ESTADO_PLAN_TEXTO[plan.estado as keyof typeof ESTADO_PLAN_TEXTO]}
          {plan.estado === "aprobacion"
            ? ". Lo resuelve quien aprueba; el plan no sigue solo: pídelo de nuevo después."
            : ""}
        </p>
      ) : null}
      {plan.error ? (
        <p role="alert" className="t-caption text-danger-fg">
          {plan.error}
        </p>
      ) : null}
      {activo || ejecutando ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={ejecutando} onClick={() => onDecidir(true)}>
            {ejecutando ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            {todo ? "Confirmar plan" : "Confirmar este paso"}
          </Button>
          <Button variant="ghost" disabled={ejecutando} onClick={() => onDecidir(false)}>
            <X className="size-4" aria-hidden />
            Descartar plan
          </Button>
        </div>
      ) : plan.estado === "vencido" ? (
        <p className="t-caption flex items-center gap-1.5">
          <CircleDashed className="size-4" aria-hidden />
          Pídelo de nuevo para generar otro plan.
        </p>
      ) : null}
    </section>
  );
}
