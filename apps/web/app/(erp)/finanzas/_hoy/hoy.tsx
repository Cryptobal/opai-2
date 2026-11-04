import { ArrowRight } from "lucide-react";

import { Badge, Card, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { pesos } from "@/lib/fechas";

export type Grupo = { cantidad: number; montoClp: number };
export type ResumenHoy = {
  hoy: string;
  emitir: { borradores: Grupo; programacionesPorGenerar: Grupo };
  cobrar: { vencidas: Grupo; recordatoriosQueTocan: Grupo };
  conciliar: { movimientosPendientes: Grupo };
};

type Fila = { clave: string; titulo: string; detalle: string; grupo: Grupo; href: string; accion: string };

function filas(r: ResumenHoy): { titulo: string; filas: Fila[] }[] {
  return [
    {
      titulo: "Emitir",
      filas: [
        { clave: "bor", titulo: "Borradores por emitir", detalle: "Facturas listas para revisar y emitir", grupo: r.emitir.borradores, href: "/finanzas/ventas?estado=borrador", accion: "Ver borradores" },
        { clave: "prog", titulo: "Programaciones que ya tocan", detalle: "Generan su borrador en la próxima corrida", grupo: r.emitir.programacionesPorGenerar, href: "/finanzas/ventas/programacion", accion: "Ver programaciones" },
      ],
    },
    {
      titulo: "Cobrar",
      filas: [
        { clave: "venc", titulo: "Facturas vencidas", detalle: "Saldo pendiente de pago", grupo: r.cobrar.vencidas, href: "/finanzas/cobranza", accion: "Ir a cobranza" },
        { clave: "rec", titulo: "Recordatorios que tocan hoy", detalle: "Según la secuencia de la empresa", grupo: r.cobrar.recordatoriosQueTocan, href: "/finanzas/cobranza", accion: "Revisar" },
      ],
    },
    {
      titulo: "Conciliar",
      filas: [
        { clave: "mov", titulo: "Movimientos por conciliar", detalle: "Abonos y cargos de la cartola sin documento", grupo: r.conciliar.movimientosPendientes, href: "/finanzas/bancos", accion: "Ir a bancos" },
      ],
    },
  ];
}

/** Bandeja única «Hoy en Finanzas»: qué emitir, cobrar y conciliar, con la acción directa de cada fila. */
export function HoyEnFinanzas({ state, resumen }: { state: EstadoPantalla; resumen: ResumenHoy | null }) {
  if (state !== "ready" || !resumen) return null;
  return (
    <div className="flex flex-col gap-4">
      {filas(resumen).map((g) => {
        const total = g.filas.reduce((s, f) => s + f.grupo.cantidad, 0);
        return (
          <Card key={g.titulo} className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="t-subheading text-fg">{g.titulo}</h2>
              <Badge tono={total > 0 ? "accent" : "neutro"}>{total}</Badge>
            </div>
            <ul className="divide-y divide-border">
              {g.filas.map((f) => (
                <li key={f.clave}>
                  <LinkNext href={f.href} className="flex min-h-11 items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{f.titulo}</span>
                      <span className="text-sm text-fg-muted">
                        {f.detalle}
                        {f.grupo.montoClp > 0 ? ` · ${pesos(f.grupo.montoClp)}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-2">
                      <span className="t-numeric font-medium">{f.grupo.cantidad}</span>
                      <span className="sr-only">{f.accion}</span>
                      <ArrowRight className="size-4 text-fg-muted" aria-hidden />
                    </span>
                  </LinkNext>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
