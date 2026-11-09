"use client";

import { createContext, useContext } from "react";

import { avisar, Badge, Button, Campo, Input, Segmentado } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { erroresValores, type ValoresTexto } from "@/lib/instrumentos-valores";

type Cambiar = (v: ValoresTexto) => void;
/** Valores por defecto del modelo, para marcar cada campo «Sobrescrito» y poder volver a él (CAR-214). */
export const DefectoCtx = createContext<ValoresTexto | null>(null);
function Num({ id, clave, etiqueta, valor, error, onCambiar }: { id: string; clave: string; etiqueta: string; valor: string; error: string | undefined; onCambiar: (v: string) => void }) {
  const defecto = useContext(DefectoCtx);
  const [g, k] = clave.split(".") as ["financiero" | "garantia" | "rc", string];
  const porDefecto = defecto ? (defecto[g] as Record<string, string>)[k] : undefined;
  const sobrescrito = porDefecto !== undefined && porDefecto !== valor;
  return (
    <Campo etiqueta={etiqueta} htmlFor={id} {...(error ? { error } : {})}>
      <Input id={id} inputMode="decimal" value={valor} aria-invalid={error ? true : undefined} onChange={(x) => onCambiar(x.target.value)} />
      {sobrescrito ? (
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <Badge tono="warning" punto={false}>Sobrescrito</Badge>
          <Button type="button" variant="ghost" onClick={() => onCambiar(porDefecto)}>Volver al valor por defecto</Button>
        </span>
      ) : null}
    </Campo>
  );
}

/** Campos de valor del costo financiero (tasa mensual), partiendo de los valores de Configuración. */
export function ValoresFinanciero({ v, onCambiar }: { v: ValoresTexto; onCambiar: Cambiar }) {
  const err = erroresValores(v);
  return <Num id="cpq-fin-tasa" clave="financiero.tasaPct" etiqueta="Tasa mensual (%)" valor={v.financiero.tasaPct} error={err["financiero.tasaPct"]} onCambiar={(t) => onCambiar({ ...v, financiero: { tasaPct: t } })} />;
}

/** Póliza de garantía: porcentaje del contrato o monto fijo en UF. */
export function ValoresGarantia({ v, onCambiar }: { v: ValoresTexto; onCambiar: Cambiar }) {
  const err = erroresValores(v);
  const g = (k: keyof ValoresTexto["garantia"], t: string) => onCambiar({ ...v, garantia: { ...v.garantia, [k]: t } });
  return (
    <div className="space-y-3">
      <Segmentado
        etiqueta="Cálculo de la póliza"
        activa={v.garantiaModo}
        opciones={[
          { id: "porcentaje", etiqueta: "% garantizado", onClick: () => onCambiar({ ...v, garantiaModo: "porcentaje" }) },
          { id: "fija", etiqueta: "Monto fijo (UF)", onClick: () => onCambiar({ ...v, garantiaModo: "fija" }) },
        ]}
      />
      {v.garantiaModo === "porcentaje" ? (
        <Num id="cpq-gar-pct" clave="garantia.contratoPct" etiqueta="% garantizado del contrato" valor={v.garantia.contratoPct} error={err["garantia.contratoPct"]} onCambiar={(t) => g("contratoPct", t)} />
      ) : (
        <Num id="cpq-gar-uf" clave="garantia.montoUf" etiqueta="Monto fijo (UF)" valor={v.garantia.montoUf} error={err["garantia.montoUf"]} onCambiar={(t) => g("montoUf", t)} />
      )}
      {/* El motor aplica la tasa anual y el gasto administrativo también al monto fijo: deben verse y editarse en ambos modos. */}
      <Num id="cpq-gar-tasa" clave="garantia.tasaAnualPct" etiqueta="Tasa anual (%)" valor={v.garantia.tasaAnualPct} error={err["garantia.tasaAnualPct"]} onCambiar={(t) => g("tasaAnualPct", t)} />
      <Num id="cpq-gar-adm" clave="garantia.administracionPct" etiqueta="Gasto administrativo (%)" valor={v.garantia.administracionPct} error={err["garantia.administracionPct"]} onCambiar={(t) => g("administracionPct", t)} />
      <Num id="cpq-gar-meses" clave="garantia.meses" etiqueta="Meses de la póliza" valor={v.garantia.meses} error={err["garantia.meses"]} onCambiar={(t) => g("meses", t)} />
      <Badge tono="info" punto={false}>Fórmula provisional</Badge>
    </div>
  );
}

/** Responsabilidad civil: prima anual en UF con % asignado, o tasa sobre el monto asegurado; y su plazo. */
export function ValoresRc({ v, onCambiar }: { v: ValoresTexto; onCambiar: Cambiar }) {
  const err = erroresValores(v);
  const r = (k: keyof ValoresTexto["rc"], t: string) => onCambiar({ ...v, rc: { ...v.rc, [k]: t } });
  return (
    <div className="space-y-3">
      <Segmentado
        etiqueta="Cálculo de la RC"
        activa={v.rcModo}
        opciones={[
          { id: "prima", etiqueta: "Prima anual (UF)", onClick: () => onCambiar({ ...v, rcModo: "prima" }) },
          { id: "tasa", etiqueta: "Tasa sobre asegurado", onClick: () => onCambiar({ ...v, rcModo: "tasa" }) },
        ]}
      />
      {v.rcModo === "prima" ? (
        <Num id="cpq-rc-prima" clave="rc.primaAnualUf" etiqueta="Prima anual (UF)" valor={v.rc.primaAnualUf} error={err["rc.primaAnualUf"]} onCambiar={(t) => r("primaAnualUf", t)} />
      ) : (
        <>
          <Num id="cpq-rc-aseg" clave="rc.aseguradoUf" etiqueta="Monto asegurado (UF)" valor={v.rc.aseguradoUf} error={err["rc.aseguradoUf"]} onCambiar={(t) => r("aseguradoUf", t)} />
          <Num id="cpq-rc-tasa" clave="rc.tasaAnualPct" etiqueta="Tasa anual (%)" valor={v.rc.tasaAnualPct} error={err["rc.tasaAnualPct"]} onCambiar={(t) => r("tasaAnualPct", t)} />
        </>
      )}
      <Num id="cpq-rc-asig" clave="rc.asignacionPct" etiqueta="% asignado a esta cotización" valor={v.rc.asignacionPct} error={err["rc.asignacionPct"]} onCambiar={(t) => r("asignacionPct", t)} />
      <Segmentado
        etiqueta="Plazo"
        activa={v.rcPlazo}
        opciones={[
          { id: "anual", etiqueta: "Anual", onClick: () => onCambiar({ ...v, rcPlazo: "anual" }) },
          { id: "contrato", etiqueta: "Plazo del contrato", onClick: () => onCambiar({ ...v, rcPlazo: "contrato" }) },
          { id: "meses", etiqueta: "N meses", onClick: () => onCambiar({ ...v, rcPlazo: "meses" }) },
        ]}
      />
      {v.rcPlazo === "meses" ? <Num id="cpq-rc-meses" clave="rc.meses" etiqueta="Meses" valor={v.rc.meses} error={err["rc.meses"]} onCambiar={(t) => r("meses", t)} /> : null}
      <Badge tono="info" punto={false}>Fórmula provisional</Badge>
    </div>
  );
}

/** Vuelve todos los instrumentos de esta cotización a los valores por defecto de la empresa. */
export function RestablecerInstrumentos({ versionId, onListo }: { versionId: string; onListo: () => void }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  async function restablecer() {
    const r = await ejecutar("cpq.versiones.parametros", { versionId, restablecerInstrumentos: true });
    if (r != null) {
      avisar.exito("Instrumentos con los valores por defecto");
      onListo();
    }
  }
  return (
    <Button type="button" variant="ghost" disabled={pendiente} onClick={() => void restablecer()}>
      Volver al valor por defecto
    </Button>
  );
}
