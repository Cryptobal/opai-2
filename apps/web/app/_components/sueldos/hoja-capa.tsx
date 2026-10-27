"use client";

import { useState } from "react";
import { Alerta, AntesDespues, avisar, Button, Dialog, ImpactoCambio, type ImpactoSueldo, Sheet } from "@opai/ds";
import type { EstructuraVista, Nivel } from "@/lib/tipos-sueldo";
import { useHojaUrl } from "../maestros/use-url";
import { useCapacidad } from "../use-capacidad";
import { CamposCapa, datosIniciales, MONTOS } from "./campos-capa";

type Props = { nivel: Nivel; refId: string; base: EstructuraVista | null; hoy: string; param?: string };
export function HojaCapa({ nivel, refId, base, hoy, param = "capa" }: Props) {
  const hoja = useHojaUrl(param);
  if (!hoja.abierta) return null;
  return <Formulario key={`${nivel}-${refId}`} nivel={nivel} refId={refId} base={base} hoy={hoy} cerrar={hoja.cerrar} />;
}
function Formulario({ nivel, refId, base, hoy, cerrar }: Props & { cerrar: () => void }) {
  const [d, cambiar] = useState(() => datosIniciales(base, hoy));
  const [preview, setPreview] = useState<ImpactoSueldo | null>(null);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const input = { nivel, [`${nivel}Id`]: refId, vigenteDesde: d.desde,
    sueldoBase: Number(d.sueldoBase), colacion: Number(d.colacion), movilizacion: Number(d.movilizacion),
    gratificacion: d.gratificacion, gratificacionMonto: d.gratificacion === "monto_fijo" ? Number(d.gratificacionMonto) : null,
    ...(d.motivo.trim() ? { motivo: d.motivo.trim() } : {}), items: d.items };
  const invalido = !d.desde || MONTOS.some((m) => d[m.clave] === "") ||
    (d.gratificacion === "monto_fijo" && d.gratificacionMonto === "") ||
    ((nivel === "persona" || d.motivo.trim()) && d.motivo.trim().length < 5);
  async function revisar() {
    const r = await ejecutar<{ impacto: ImpactoSueldo }>("core.estructuras.create", input, true);
    if (r) setPreview(r.impacto);
  }
  async function guardar() {
    const r = await ejecutar("core.estructuras.create", input);
    if (!r) return;
    avisar.exito(nivel === "persona" ? "Sueldo por RUT guardado" : "Versión de sueldo guardada");
    cerrar();
  }
  return <Sheet abierto onCerrar={cerrar} titulo={nivel === "persona" ? "Definir sueldo por RUT" : "Nueva versión de sueldo"}
    descripcion="Define todos los conceptos. Las capas no se combinan y la versión anterior se cierra el día previo."
    acciones={<><Button variant="secondary" disabled={pendiente} onClick={cerrar}>Cancelar</Button><Button disabled={pendiente || Boolean(invalido)} onClick={() => void revisar()}>{pendiente ? "Revisando…" : "Revisar cambio"}</Button></>}>
    {error && !preview ? <Alerta tono="danger" titulo={error} /> : null}
    <fieldset disabled={pendiente} className="flex flex-col gap-4"><CamposCapa datos={d} cambiar={cambiar} motivoObligatorio={nivel === "persona"} /></fieldset>
    <Dialog abierto={Boolean(preview)} onCerrar={() => setPreview(null)} titulo="Confirmar versión de sueldo" descripcion="La escritura revalida la vigencia y el alcance. El impacto es una vista previa, no una reserva."
      acciones={<><Button variant="secondary" disabled={pendiente} onClick={() => setPreview(null)}>Volver</Button><Button disabled={pendiente} onClick={() => void guardar()}>{pendiente ? "Guardando…" : "Guardar versión"}</Button></>}>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {preview ? <><AntesDespues diferencias={preview.diferencias} /><ImpactoCambio impacto={preview} /></> : null}
    </Dialog>
  </Sheet>;
}
