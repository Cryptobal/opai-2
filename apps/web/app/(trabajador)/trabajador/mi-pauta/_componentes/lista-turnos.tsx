import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge, Empty } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { etiquetaDia, horario, horas, type MisTurnos, porSemana, sumarDias } from "./semanas";

const DIAS = 28;

/**
 * «Mi pauta» del portal del trabajador (CAR-462): sus turnos de 4 semanas, agrupados por semana. Cada fila dice el día,
 * el horario en la zona de la empresa, la instalación y el puesto. Sin JavaScript de cliente: la navegación entre
 * ventanas es un enlace con `?desde=` (ADR-037).
 */
export function ListaTurnos({ r }: { r: MisTurnos }) {
  const hoy = r.hoy;
  const semanas = porSemana(r.items);
  const desdeHoy = r.desde === hoy;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="t-title mb-1 text-fg md:hidden">Mi pauta</h2>
        <p className="t-body-sm">Tus turnos de las próximas 4 semanas. Si algo cambia, te avisamos.</p>
      </div>
      <nav aria-label="Semanas" className="flex flex-wrap items-center gap-2">
        {desdeHoy ? null : (
          <EnlaceBoton href={`/trabajador/mi-pauta?desde=${sumarDias(r.desde, -DIAS)}`} variante="secondary" icono={ChevronLeft}>
            Anteriores
          </EnlaceBoton>
        )}
        <EnlaceBoton href={`/trabajador/mi-pauta?desde=${sumarDias(r.desde, DIAS)}`} variante="secondary" icono={ChevronRight}>
          Siguientes
        </EnlaceBoton>
        {desdeHoy ? null : (
          <EnlaceBoton href="/trabajador/mi-pauta" variante="ghost">
            Volver a hoy
          </EnlaceBoton>
        )}
      </nav>
      {semanas.length === 0 ? (
        <Empty
          titulo="No tienes turnos en estas semanas"
          descripcion="Cuando tu empresa publique tu pauta, tus turnos aparecerán aquí."
        />
      ) : (
        semanas.map((s) => (
          <section key={s.lunes} aria-label={s.etiqueta} className="flex flex-col gap-2">
            <h3 className="t-label text-fg-muted">{s.etiqueta}</h3>
            <ul className="-mx-4 divide-y divide-border border-y border-border bg-surface md:mx-0 md:rounded-lg md:border">
              {s.turnos.map((t) => (
                <li key={t.id} className="flex min-h-11 items-start gap-3 px-4 py-3">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 font-medium text-fg">
                      {etiquetaDia(t.fecha)}
                      {t.fecha === hoy ? <Badge tono="info">Hoy</Badge> : null}
                      {t.feriado ? <Badge tono="warning">Feriado</Badge> : null}
                    </span>
                    <span className="t-caption truncate">
                      {t.instalacion.nombre}
                      {t.puesto ? ` · ${t.puesto}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-none flex-col items-end gap-0.5">
                    <span className="t-numeric font-medium text-fg">{horario(t, r.zona)}</span>
                    <span className="t-caption t-numeric">{horas(t.horas)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
