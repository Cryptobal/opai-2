"use client";

import { Badge, Pares, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { cuandoCompleto } from "@/lib/fechas";

import { LLEGADA, RESULTADO, resumenRevision, textoLlegada, type Visita } from "./tipos";

/** Detalle de una visita de supervisión (CAR-83), abierto por `?visita=<id>`. Solo lectura. */
export function HojaVisita({ visitas }: { visitas: readonly Visita[] }) {
  const hoja = useHojaUrl("visita");
  const v = visitas.find((x) => x.id === hoja.valor);
  if (!hoja.abierta || !v) return null;
  return (
    <Sheet abierto onCerrar={hoja.cerrar} titulo="Visita de supervisión">
      <div className="flex flex-col gap-4">
        <Pares
          items={[
            { etiqueta: "Supervisor", valor: v.supervisor ?? "—" },
            { etiqueta: "Llegada", valor: cuandoCompleto(v.iniciadaEn) },
            { etiqueta: "Cierre", valor: v.cerradaEn ? cuandoCompleto(v.cerradaEn) : "En curso" },
            {
              etiqueta: "Ubicación",
              valor: <Badge tono={LLEGADA[v.geocerca].tono}>{textoLlegada(v)}</Badge>,
            },
            { etiqueta: "Revisión", valor: resumenRevision(v) },
          ]}
        />
        {v.checklist.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h3 className="t-label text-fg">Lista de revisión</h3>
            <ul className="overflow-hidden rounded-lg border border-border bg-surface">
              {v.checklist.map((i) => (
                <li
                  key={i.texto}
                  className="flex flex-col gap-1 border-b border-border px-4 py-2.5 last:border-b-0"
                >
                  <span className="flex items-center justify-between gap-2 text-base text-fg">
                    {i.texto}
                    <Badge
                      tono={
                        i.resultado === "no_cumple"
                          ? "danger"
                          : i.resultado === "cumple"
                            ? "success"
                            : "neutro"
                      }
                    >
                      {RESULTADO[i.resultado]}
                    </Badge>
                  </span>
                  {i.nota ? <span className="t-caption">{i.nota}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {v.observaciones ? (
          <section className="flex flex-col gap-1">
            <h3 className="t-label text-fg">Observaciones</h3>
            <p className="text-base text-fg">{v.observaciones}</p>
          </section>
        ) : null}
      </div>
    </Sheet>
  );
}
