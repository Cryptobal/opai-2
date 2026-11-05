"use client";

import { Switch } from "@opai/ds";

import { type EstadoMargen, type ParametrosVersion, pctTexto } from "./margen-form";

/** Instrumentos financieros de la versión: un interruptor por instrumento con su tasa vigente (CPQ v4). */
export function MargenInstrumentos({
  e,
  p,
  set,
  deshabilitado,
}: {
  e: EstadoMargen;
  p: ParametrosVersion;
  set: (c: Partial<EstadoMargen>) => void;
  deshabilitado: boolean;
}) {
  const { garantia, rc, financiero } = p.instrumentos;
  return (
    <section aria-labelledby="cpq-instrumentos" className="space-y-1">
      <h3 id="cpq-instrumentos" className="t-label">
        Instrumentos
      </h3>
      <div className="divide-y divide-border">
        <Switch
          etiqueta="Póliza de garantía"
          descripcion={`${pctTexto(garantia.contratoPct)} del contrato · ${garantia.meses} meses`}
          activo={e.garantia}
          disabled={deshabilitado}
          onCambiar={(garantiaOn) => set({ garantia: garantiaOn })}
        />
        <Switch
          etiqueta="Responsabilidad civil"
          descripcion={`Tasa anual ${pctTexto(rc.tasaAnualPct)}`}
          activo={e.rc}
          disabled={deshabilitado}
          onCambiar={(rcOn) => set({ rc: rcOn })}
        />
        <Switch
          etiqueta="Costo financiero"
          descripcion={`Tasa ${pctTexto(financiero.tasaPct)}`}
          activo={e.financiero}
          disabled={deshabilitado}
          onCambiar={(financieroOn) => set({ financiero: financieroOn })}
        />
      </div>
      {p.sobrescrito ? <p className="t-caption text-fg-muted">Esta versión ya no usa los valores por defecto de la empresa.</p> : null}
    </section>
  );
}
