"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Select, Sheet, Textarea } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { type Compra, NOMBRE_DTE } from "../../_componentes/tipos";

type Vista = {
  accion: string;
  accionesSii: string[];
  estadoNuevo: string;
  fueraDePlazo: boolean;
  aviso?: string;
  compra: Compra;
};

const ACCIONES = [
  { valor: "aceptar", etiqueta: "Aceptar (acuse y uso de crédito IVA)" },
  { valor: "aceptar_contenido", etiqueta: "Aceptar solo el contenido" },
  { valor: "reclamar_contenido", etiqueta: "Reclamar el contenido" },
  { valor: "reclamar_parcial", etiqueta: "Reclamar falta parcial" },
  { valor: "reclamar_total", etiqueta: "Reclamar falta total" },
] as const;

/** Notifica al SII la aceptación o el reclamo del documento (CAR-644). */
export function HojaRecepcion({ compra }: { compra: Compra }) {
  const hoja = useHojaUrl("recepcion");
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [accion, setAccion] = useState<(typeof ACCIONES)[number]["valor"]>("aceptar");
  const [motivo, setMotivo] = useState("");
  const [vista, setVista] = useState<Vista | null>(null);

  const tituloDoc = `${NOMBRE_DTE[compra.tipoDte] ?? compra.tipoDte} ${compra.folio}`;
  const entrada = () => ({ documentoId: compra.id, accion, ...(motivo.trim() ? { motivo: motivo.trim() } : {}) });

  function cambiarAccion(v: (typeof ACCIONES)[number]["valor"]) {
    setAccion(v);
    setVista(null);
    limpiarError();
  }

  async function previsualizar() {
    setVista(await ejecutar<Vista>("finanzas.compras.recepcion_sii", entrada(), true));
  }

  async function enviar() {
    const r = await ejecutar<Vista>("finanzas.compras.recepcion_sii", entrada(), false, "layout", `rcv-${compra.id}-${accion}`);
    if (!r) return;
    avisar.exito(`Recepción ante el SII actualizada: ${r.estadoNuevo === "aceptado" ? "aceptado" : "reclamado"}`);
    hoja.cerrar();
  }

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Aceptar o reclamar ante el SII"
      descripcion={`${tituloDoc} · ${compra.proveedorNombre}. La acción queda registrada en el SII y no se puede deshacer desde OPAI.`}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>{vista ? "Cerrar" : "Cancelar"}</Button>
          {vista ? (
            <Button disabled={pendiente} onClick={() => void enviar()}>
              {pendiente ? "Enviando al SII…" : "Confirmar ante el SII"}
            </Button>
          ) : (
            <Button disabled={pendiente} onClick={() => void previsualizar()}>
              {pendiente ? "Preparando…" : "Ver vista previa"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {compra.diasParaReclamo < 0 ? (
          <Alerta tono="warning" titulo="El plazo de 8 días para acusar ya venció; el SII puede rechazar la acción." />
        ) : null}
        <Campo etiqueta="Acción" htmlFor="recepcion-accion">
          <Select id="recepcion-accion" valor={accion} onCambiar={(v) => cambiarAccion(v as (typeof ACCIONES)[number]["valor"])} opciones={[...ACCIONES]} />
        </Campo>
        <Campo etiqueta="Nota interna (opcional)" htmlFor="recepcion-motivo" ayuda="Solo auditoría en OPAI; no se envía al SII.">
          <Textarea id="recepcion-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} maxLength={500} />
        </Campo>
        {vista ? (
          <Alerta tono="info" titulo={`Quedará como «${vista.estadoNuevo === "aceptado" ? "Aceptado" : "Reclamado"}» ante el SII`}>
            {`SimpleAPI enviará ${vista.accionesSii.join(" y ")}.`}
            {vista.aviso ? ` ${vista.aviso}` : ""}
          </Alerta>
        ) : null}
      </div>
    </Sheet>
  );
}