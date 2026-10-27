"use client";

import { Button, Campo, Checkbox, Input, InputFecha, Select, Textarea } from "@opai/ds";
import { InputPesos } from "../maestros/input-pesos";
import type { EstructuraVista, ItemEstructura } from "@/lib/tipos-sueldo";

export const MONTOS = [
  { clave: "sueldoBase", etiqueta: "Sueldo base" }, { clave: "colacion", etiqueta: "Colación" },
  { clave: "movilizacion", etiqueta: "Movilización" },
] as const;
export function datosIniciales(base: EstructuraVista | null, hoy: string) {
  const visible = base && !base.sensible ? base : null;
  return { sueldoBase: String(visible?.sueldoBase ?? ""), colacion: String(visible?.colacion ?? ""),
    movilizacion: String(visible?.movilizacion ?? ""), gratificacion: visible?.gratificacion ?? "legal_25",
    gratificacionMonto: String(visible?.gratificacionMonto ?? ""), desde: hoy, motivo: "", items: visible?.items ?? [] };
}
export type DatosCapa = ReturnType<typeof datosIniciales>;
export function CamposCapa({ datos: d, cambiar, motivoObligatorio }: {
  datos: DatosCapa; cambiar: (d: DatosCapa) => void; motivoObligatorio: boolean;
}) {
  const bono = (indice: number, cambios: Partial<ItemEstructura>) => cambiar({ ...d, items: d.items.map((i, j) => j === indice ? { ...i, ...cambios } : i) });
  return <div className="flex flex-col gap-4">
    {MONTOS.map((m) => <Campo key={m.clave} etiqueta={m.etiqueta} htmlFor={`c-${m.clave}`} ayuda="Define el monto completo; 0 es válido">
      <InputPesos id={`c-${m.clave}`} valor={d[m.clave]} onCambiar={(v) => cambiar({ ...d, [m.clave]: v })} />
    </Campo>)}
    <Campo etiqueta="Gratificación" htmlFor="c-grat"><Select id="c-grat" valor={d.gratificacion} onCambiar={(v) => cambiar({ ...d, gratificacion: v })} opciones={[
      { valor: "legal_25", etiqueta: "Legal 25 % con tope" }, { valor: "monto_fijo", etiqueta: "Monto fijo" }, { valor: "ninguna", etiqueta: "Ninguna" },
    ]} /></Campo>
    {d.gratificacion === "monto_fijo" ? <Campo etiqueta="Monto de gratificación" htmlFor="c-grat-monto"><InputPesos id="c-grat-monto" valor={d.gratificacionMonto} onCambiar={(v) => cambiar({ ...d, gratificacionMonto: v })} /></Campo> : null}
    <Campo etiqueta="Vigente desde" htmlFor="c-desde"><InputFecha id="c-desde" valor={d.desde} onCambiar={(v) => cambiar({ ...d, desde: v })} /></Campo>
    <Campo etiqueta={motivoObligatorio ? "Motivo obligatorio" : "Motivo"} htmlFor="c-motivo" ayuda="Mínimo 5 caracteres cuando se indica"><Textarea id="c-motivo" value={d.motivo} onChange={(e) => cambiar({ ...d, motivo: e.target.value })} /></Campo>
    <h3 className="t-subheading">Bonos de esta capa</h3>
    {d.items.map((i, j) => <fieldset key={j} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <legend className="t-label">Bono {j + 1}</legend>
      <Campo etiqueta="Nombre del bono" htmlFor={`b-n-${j}`}><Input id={`b-n-${j}`} value={i.nombre} onChange={(e) => bono(j, { nombre: e.target.value })} /></Campo>
      <Campo etiqueta="Tipo de bono" htmlFor={`b-t-${j}`}><Select id={`b-t-${j}`} valor={i.tipo} onCambiar={(v) => bono(j, { tipo: v as ItemEstructura["tipo"], monto: null, porcentaje: null })} opciones={[{ valor: "bono_fijo", etiqueta: "Monto fijo" }, { valor: "bono_porcentual", etiqueta: "Porcentual" }]} /></Campo>
      <Campo etiqueta={i.tipo === "bono_fijo" ? "Monto del bono" : "Porcentaje (escala: 10000 = 1 %)"} htmlFor={`b-m-${j}`}><InputPesos id={`b-m-${j}`} valor={String((i.tipo === "bono_fijo" ? i.monto : i.porcentaje) ?? "")} onCambiar={(v) => bono(j, i.tipo === "bono_fijo" ? { monto: v ? Number(v) : null } : { porcentaje: v ? Number(v) : null })} /></Campo>
      <Checkbox etiqueta="Imponible" marcado={i.imponible} onCambiar={(v) => bono(j, { imponible: v })} />
      <Button variant="ghost" onClick={() => cambiar({ ...d, items: d.items.filter((_, n) => n !== j) })}>Quitar bono {j + 1}</Button>
    </fieldset>)}
    <Button variant="secondary" disabled={d.items.length >= 30} onClick={() => cambiar({ ...d, items: [...d.items, { nombre: "", tipo: "bono_fijo", monto: null, porcentaje: null, imponible: true, tributable: true }] })}>Agregar bono</Button>
  </div>;
}
