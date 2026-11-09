"use client";

import { useMemo, useState } from "react";

import { Alerta, avisar, Button, Campo, InputMonto, Segmentado, Select, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { efectoPredefinidos, entradaPredefinidos, type FilaPredefinido, validarPredefinidos } from "@/lib/costos-predefinidos-borrador";

export type ItemPredefinido = { categoria: string; montoClp: number; alcance: "global" | "por_puesto"; activo: boolean };
type Categoria = { id: string; nombre: string };

let contador = 0;
const desde = (i: ItemPredefinido): FilaPredefinido => ({ clave: `p${++contador}`, categoria: i.categoria, monto: String(i.montoClp), alcance: i.alcance, activo: i.activo });

/** Costos que la empresa carga solos en cada cotización nueva (uniforme, etc.); guardar reemplaza la lista (CAR-213). */
export function CostosPredefinidosEditable({ items, categorias, editable }: { items: readonly ItemPredefinido[]; categorias: readonly Categoria[]; editable: boolean }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [filas, setFilas] = useState<FilaPredefinido[]>(() => items.map(desde));
  const [intento, setIntento] = useState(false);
  const { ok, filas: errores } = useMemo(() => validarPredefinidos(filas), [filas]);
  const cambiar = (k: string, c: Partial<FilaPredefinido>) => setFilas((fs) => fs.map((f) => (f.clave === k ? { ...f, ...c } : f)));
  const nombre = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? id;

  async function guardar() {
    setIntento(true);
    if (!ok) return;
    const r = await ejecutar("cpq.costos_predefinidos.guardar", { items: entradaPredefinidos(filas) });
    if (r != null) avisar.exito("Costos predefinidos guardados");
  }

  return (
    <section aria-labelledby="predef-titulo" className="space-y-3">
      <div>
        <h3 id="predef-titulo" className="t-subheading">Costos predefinidos</h3>
        <p className="t-caption text-fg-muted">Se cargan solos en cada cotización nueva. No pisan lo que ya editaste y no se duplican.</p>
      </div>
      {filas.length === 0 ? (
        <p className="t-body-sm text-fg-muted">Aún no hay costos predefinidos.{editable ? " Agrega el primero." : ""}</p>
      ) : null}
      <ul className="space-y-3">
        {filas.map((f, i) => {
          const e = intento ? errores[i] : undefined;
          return (
            <li key={f.clave} className="space-y-3 rounded-lg border border-border p-3">
              <Campo etiqueta="Categoría" htmlFor={`${f.clave}-c`} {...(e?.categoria ? { error: e.categoria } : {})}>
                <Select
                  id={`${f.clave}-c`}
                  valor={f.categoria || undefined}
                  placeholder="Elige una categoría"
                  disabled={!editable}
                  invalido={Boolean(e?.categoria)}
                  opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
                  onCambiar={(v) => cambiar(f.clave, { categoria: v })}
                />
              </Campo>
              <Campo etiqueta="Monto mensual (CLP)" htmlFor={`${f.clave}-m`} {...(e?.monto ? { error: e.monto } : {})}>
                <InputMonto id={`${f.clave}-m`} valor={f.monto} disabled={!editable} invalido={Boolean(e?.monto)} onCambiar={(v) => cambiar(f.clave, { monto: v })} />
              </Campo>
              <Segmentado
                etiqueta="Alcance"
                activa={f.alcance}
                opciones={[
                  { id: "global", etiqueta: "Una vez por cotización", onClick: () => editable && cambiar(f.clave, { alcance: "global" }) },
                  { id: "por_puesto", etiqueta: "En cada puesto", onClick: () => editable && cambiar(f.clave, { alcance: "por_puesto" }) },
                ]}
              />
              <div className="flex items-center justify-between">
                <Switch etiqueta={`Activo · ${nombre(f.categoria)}`} activo={f.activo} onCambiar={(v) => editable && cambiar(f.clave, { activo: v })} />
                {editable ? <Button type="button" variant="ghost" onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}>Quitar</Button> : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="t-caption text-fg-muted">«Feriados» no aparece: es una categoría fija del modelo de costeo.</p>
      {editable ? (
        <>
          <Button type="button" variant="secondary" disabled={categorias.length === 0} onClick={() => setFilas((fs) => [...fs, { clave: `p${++contador}`, categoria: "", monto: "", alcance: "por_puesto", activo: true }])}>
            Agregar costo
          </Button>
          <Alerta tono="info" titulo={`${efectoPredefinidos(filas)} No cambia las cotizaciones que ya existen.`} />
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <div className="flex justify-end">
            <Button type="button" disabled={pendiente || (intento && !ok)} onClick={() => void guardar()}>
              {pendiente ? "Guardando…" : "Guardar lista"}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
