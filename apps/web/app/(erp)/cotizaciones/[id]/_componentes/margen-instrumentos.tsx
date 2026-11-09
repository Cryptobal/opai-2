"use client";

import { Badge, Switch } from "@opai/ds";

import { valoresIniciales } from "@/lib/instrumentos-valores";

import { DefectoCtx, ValoresFinanciero, ValoresGarantia, ValoresRc, RestablecerInstrumentos } from "./margen-valores";
import { type EstadoMargen, type ParametrosVersion, pctTexto } from "./margen-form";

/** Instrumentos financieros de la versión: un interruptor por instrumento con su tasa vigente (CPQ v4). */
export function MargenInstrumentos({
  e,
  p,
  set,
  deshabilitado,
  versionId,
  onRestablecido,
}: {
  versionId: string;
  onRestablecido: () => void;
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
      <DefectoCtx.Provider value={valoresIniciales(p.instrumentosDefecto)}>
      <div className="divide-y divide-border">
        <Switch
          etiqueta="Póliza de garantía"
          descripcion={`${pctTexto(garantia.contratoPct)} del contrato · ${garantia.meses} meses`}
          activo={e.garantia}
          disabled={deshabilitado}
          onCambiar={(garantiaOn) => set({ garantia: garantiaOn })}
        />
        {e.garantia ? <div className="py-3"><ValoresGarantia v={e.valores} onCambiar={(valores) => set({ valores })} /></div> : null}
        <Switch
          etiqueta="Responsabilidad civil"
          descripcion={`Tasa anual ${pctTexto(rc.tasaAnualPct)}`}
          activo={e.rc}
          disabled={deshabilitado}
          onCambiar={(rcOn) => set({ rc: rcOn })}
        />
        {e.rc ? <div className="py-3"><ValoresRc v={e.valores} onCambiar={(valores) => set({ valores })} /></div> : null}
        <Switch
          etiqueta="Costo financiero"
          descripcion={`Tasa ${pctTexto(financiero.tasaPct)}`}
          activo={e.financiero}
          disabled={deshabilitado}
          onCambiar={(financieroOn) => set({ financiero: financieroOn })}
        />
        {e.financiero ? <div className="py-3"><ValoresFinanciero v={e.valores} onCambiar={(valores) => set({ valores })} /></div> : null}
      </div>
      </DefectoCtx.Provider>
      <p className="t-caption text-fg-muted">Cambiar un valor afecta solo esta cotización: no cambia Configuración ni otras cotizaciones.</p>
      {p.sobrescrito ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tono="warning" punto={false}>Sobrescrito</Badge>
          <span className="t-caption text-fg-muted">Esta cotización ya no usa los valores por defecto de la empresa.</span>
          <RestablecerInstrumentos versionId={versionId} onListo={onRestablecido} />
        </div>
      ) : null}
    </section>
  );
}
