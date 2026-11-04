"use client";

import { useState } from "react";

import { Alerta, Button, Campo, Checkbox, Dialog, Input, Textarea } from "@opai/ds";

import { pesos } from "@/lib/fechas";

import type { ItemCierre, ResultadoLote } from "./tipos";

/** OC/HES del cliente y si la empresa la exige para emitir. */
export function DialogoOcHes(p: { item: ItemCierre; pendiente: boolean; onCerrar: () => void; onGuardar: (v: { ordenCompra: string; hes: string; requiereOcHes: boolean }) => void }) {
  const [oc, setOc] = useState(p.item.ordenCompra ?? "");
  const [hes, setHes] = useState(p.item.hes ?? "");
  const [req, setReq] = useState(p.item.requiereOcHes);
  return (
    <Dialog abierto titulo="OC y HES del cliente" onCerrar={p.onCerrar}>
      <div className="flex flex-col gap-3">
        <Campo etiqueta="N° de orden de compra" htmlFor="cierre-oc"><Input id="cierre-oc" value={oc} maxLength={60} onChange={(e) => setOc(e.target.value)} /></Campo>
        <Campo etiqueta="N° de HES" htmlFor="cierre-hes"><Input id="cierre-hes" value={hes} maxLength={60} onChange={(e) => setHes(e.target.value)} /></Campo>
        <Checkbox marcado={req} onCambiar={setReq} etiqueta="Este cliente exige OC o HES para facturar" />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={p.onCerrar}>Cancelar</Button>
        <Button disabled={p.pendiente} onClick={() => p.onGuardar({ ordenCompra: oc, hes, requiereOcHes: req })}>Guardar</Button>
      </div>
    </Dialog>
  );
}

export function DialogoObservar(p: { pendiente: boolean; onCerrar: () => void; onGuardar: (texto: string) => void }) {
  const [texto, setTexto] = useState("");
  return (
    <Dialog abierto titulo="Observación del cliente" onCerrar={p.onCerrar}>
      <Campo etiqueta="Qué debemos corregir" htmlFor="cierre-obs">
        <Textarea id="cierre-obs" value={texto} maxLength={500} onChange={(e) => setTexto(e.target.value)} />
      </Campo>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={p.onCerrar}>Cancelar</Button>
        <Button disabled={p.pendiente || !texto.trim()} onClick={() => p.onGuardar(texto)}>Guardar</Button>
      </div>
    </Dialog>
  );
}

/** Confirmación del lote: la vista previa dice qué se emite y qué se omite; confirmar es la aprobación. */
export function DialogoLote(p: { items: ItemCierre[]; vista: ResultadoLote | null; pendiente: boolean; onCerrar: () => void; onEmitir: () => void }) {
  const omitidoIds = new Set(p.vista?.resultados.filter((r) => r.estado === "omitido").map((r) => r.documentoId));
  const total = p.items.filter((i) => !omitidoIds.has(i.documentoId)).reduce((s, i) => s + i.montoTotal, 0);
  const omitidos = p.vista?.resultados.filter((r) => r.estado === "omitido") ?? [];
  return (
    <Dialog abierto titulo={`Emitir ${p.items.length} documento${p.items.length === 1 ? "" : "s"}`} onCerrar={p.onCerrar}>
      <p className="t-body-sm">
        Se asignará folio y se firmará cada documento, por <strong className="t-numeric">{pesos(total)}</strong> en total. Es irreversible; si
        una emisión falla, no se emite ninguna.
      </p>
      {omitidos.length ? (
        <Alerta tono="warning" titulo="Se omitirán">
          {omitidos.map((o) => o.motivo).join(" ")}
        </Alerta>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={p.onCerrar}>Cancelar</Button>
        <Button disabled={p.pendiente || !p.vista || p.vista.emitidos === 0} onClick={p.onEmitir}>
          Emitir {p.vista?.emitidos ?? ""}
        </Button>
      </div>
    </Dialog>
  );
}
