"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { Alerta, avisar, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { HojaCeder } from "./hoja-ceder";
import { HojaCobroManual } from "./hoja-cobro-manual";
import { HojaNotaCredito } from "./hoja-nota-credito";
import type { Venta } from "./tipos";

const EmitirBorradorFicha = dynamic(() => import("./emitir-borrador-ficha").then((m) => ({ default: m.EmitirBorradorFicha })));

function descargar(base64: string, nombre: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const el = document.createElement("a");
  el.href = url;
  el.download = nombre;
  el.click();
  URL.revokeObjectURL(url);
}

/** Acciones de la ficha: cada una llama a su capacidad; el servidor decide si corresponde. */
export function AccionesVenta({ venta, enviosPrevios, montoPendiente }: { venta: Venta; enviosPrevios: number; montoPendiente: number }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const intento = useRef(crypto.randomUUID());
  const [hoja, setHoja] = useState<"nc" | "ceder" | "reenviar" | "cobro" | null>(null);
  const emitido = venta.estadoDte === "enviado" || venta.estadoDte === "aceptado";
  const puedeCeder = venta.estadoDte === "aceptado" && (venta.tipoDte === 33 || venta.tipoDte === 34) && venta.cesionEstado !== "cedido";

  const porCobrar = montoPendiente; // monto − notas de crédito parciales − cobrado (calculado en el servidor)
  const puedeCobrar = venta.estadoDte === "aceptado" && venta.cesionEstado !== "cedido" && (venta.tipoDte === 33 || venta.tipoDte === 34) && porCobrar > 0;

  async function pdf() {
    const r = await ejecutar<{ base64: string }>("finanzas.ventas.pdf", { documentoId: venta.id }, false, "ninguna");
    if (r) descargar(r.base64, `documento-${venta.folio ?? venta.id}.pdf`);
  }

  async function alSii() {
    const r = await ejecutar("finanzas.ventas.enviar_sii", { documentoId: venta.id });
    if (r) avisar.exito("Documento enviado al SII");
  }

  async function alCliente(reenviar: boolean) {
    limpiarError();
    const r = await ejecutar<{ estado: string; para: string }>(
      "finanzas.ventas.enviar_cliente",
      { documentoId: venta.id, reenviar },
      false,
      "layout",
      `cliente-${venta.id}-${intento.current}`,
    );
    setHoja(null);
    intento.current = crypto.randomUUID();
    if (r?.estado === "enviado") avisar.exito(`Enviado a ${r.para}`);
    else if (r) avisar.error("El correo no salió. Revisa el historial de envíos.");
  }

  // Un borrador (factura o nota de débito de cargo) se revisa y emite desde su ficha (CAR-234).
  if (venta.estadoDte === "borrador") return <EmitirBorradorFicha documentoId={venta.id} tipoDte={venta.tipoDte} />;

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alerta tono="danger" titulo="No se pudo completar">{error}</Alerta> : null}
      <div className="flex flex-wrap gap-2">
        {emitido ? <Button variant="secondary" disabled={pendiente} onClick={() => void pdf()}>Descargar PDF</Button> : null}
        {venta.estadoDte === "enviado" ? <Button variant="secondary" disabled={pendiente} onClick={() => void alSii()}>Enviar al SII</Button> : null}
        {emitido ? (
          <Button disabled={pendiente} onClick={() => (enviosPrevios > 0 ? setHoja("reenviar") : void alCliente(false))}>
            Enviar al cliente
          </Button>
        ) : null}
        {emitido && (venta.tipoDte === 33 || venta.tipoDte === 34) ? <Button variant="secondary" onClick={() => setHoja("nc")}>Nota de crédito</Button> : null}
        {puedeCobrar ? <Button variant="secondary" onClick={() => setHoja("cobro")}>Registrar cobro</Button> : null}
        {puedeCeder ? <Button variant="secondary" onClick={() => setHoja("ceder")}>Ceder</Button> : null}
      </div>
      {hoja === "nc" ? <HojaNotaCredito documentoId={venta.id} total={venta.montoTotal} abierta onCerrar={() => setHoja(null)} /> : null}
      {hoja === "cobro" ? <HojaCobroManual documentoId={venta.id} pendienteCobro={porCobrar} abierta onCerrar={() => setHoja(null)} /> : null}
      {hoja === "ceder" ? <HojaCeder documentoId={venta.id} abierta onCerrar={() => setHoja(null)} /> : null}
      {hoja === "reenviar" ? (
        <Dialog abierto titulo="¿Reenviar al cliente?" onCerrar={() => setHoja(null)}>
          <p className="text-sm">Este documento ya se envió {enviosPrevios} {enviosPrevios === 1 ? "vez" : "veces"}. El cliente recibirá otro correo.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setHoja(null)}>Cancelar</Button>
            <Button disabled={pendiente} onClick={() => void alCliente(true)}>Reenviar</Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
