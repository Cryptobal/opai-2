import { Badge, Empty, SeccionTarjeta } from "@opai/ds";

import { fechaCorta } from "@/lib/formato";

import { AbrirPeriodo } from "./abrir-periodo";
import { AccionesPeriodo } from "./acciones-periodo";
import { ESTADO_PERIODO } from "./etiquetas";
import type { Periodo } from "./tipos";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

/** Períodos de remuneraciones: el actual destacado arriba y los anteriores debajo (diseño 01). */
export function ListaPeriodos({ periodos, sugerido, gestiona, puedePagar, puedeVerNovedades }: {
  periodos: Periodo[];
  sugerido: { anio: number; mes: number };
  gestiona: boolean;
  puedePagar: boolean;
  puedeVerNovedades: boolean;
}) {
  if (periodos.length === 0)
    return (
      <Empty
        titulo="Aún no hay períodos"
        descripcion="Abre el primer período para empezar a cargar novedades del mes."
        {...(gestiona ? { accion: <AbrirPeriodo sugerido={sugerido} /> } : {})}
      />
    );
  const actual = periodos.find((p) => p.estado !== "pagado") ?? periodos[0];
  return (
    <div className="flex flex-col gap-4">
      {periodos.map((p) => {
        const est = ESTADO_PERIODO[p.estado];
        return (
          <SeccionTarjeta key={p.id} titulo={p.etiqueta + (p.id === actual?.id ? " · período actual" : "")}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Badge tono={est.tono}>{est.etiqueta}</Badge>
              <span className="t-caption">
                {fechaCorta(p.inicio)} – {fechaCorta(p.fin)} · cierre previsto {fechaCorta(p.cierrePrevisto)}
              </span>
              <span className="t-caption">{p.novedades} novedades vigentes</span>
            </div>
            {p.motivoReapertura && p.estado !== "pagado" ? (
              <p className="t-caption mt-2">Última devolución: {p.motivoReapertura}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {puedeVerNovedades ? (
                <EnlaceBoton href={`/nomina/novedades?periodo=${p.id}`} variante="ghost">Ver novedades</EnlaceBoton>
              ) : null}
              {gestiona ? <AccionesPeriodo periodo={p} puedePagar={puedePagar} /> : null}
            </div>
          </SeccionTarjeta>
        );
      })}
    </div>
  );
}
