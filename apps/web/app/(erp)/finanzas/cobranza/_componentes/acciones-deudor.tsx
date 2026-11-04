"use client";

import { useRef, useState } from "react";

import { Alerta, avisar, Badge, Button, Campo, Dialog, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fecha, pesos } from "@/lib/fechas";

import { TRAMO } from "./etiquetas";
import type { FacturaVencida, FichaDeudor } from "./tipos";

/** Facturas vencidas con sus acciones: recordar por correo (con vista previa), pausar y anotar. */
export function AccionesDeudor(p: {
  facturas: FacturaVencida[];
  contactos: FichaDeudor["contactos"];
  gestiona: boolean;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const intento = useRef(crypto.randomUUID());
  const [recordar, setRecordar] = useState<FacturaVencida | null>(null);
  const [nota, setNota] = useState<FacturaVencida | null>(null);
  const [texto, setTexto] = useState("");
  const para = p.contactos.find((c) => c.email)?.email ?? null;

  async function enviar(f: FacturaVencida) {
    limpiarError();
    const r = await ejecutar<{ estado: string; para: string | null }>(
      "finanzas.cobranza.recordar",
      { documentoId: f.documentoId },
      false,
      "layout",
      `recordar-${f.documentoId}-${intento.current}`,
    );
    setRecordar(null);
    intento.current = crypto.randomUUID();
    if (r?.estado === "enviado") avisar.exito(`Recordatorio enviado a ${r.para}`);
    else if (r) avisar.error("El correo no salió. Revisa el historial de gestiones.");
  }

  async function pausar(f: FacturaVencida) {
    const r = await ejecutar("finanzas.cobranza.pausar", { documentoId: f.documentoId, pausada: !f.pausada }, false, "layout");
    if (r) avisar.exito(f.pausada ? "Cobranza reanudada" : "Cobranza pausada");
  }

  async function anotar(f: FacturaVencida) {
    const r = await ejecutar("finanzas.cobranza.registrar_gestion", { documentoId: f.documentoId, detalle: texto }, false, "layout");
    setNota(null);
    setTexto("");
    if (r) avisar.exito("Gestión registrada");
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alerta tono="danger" titulo="No se pudo completar">{error}</Alerta> : null}
      <ul className="divide-y divide-border">
        {p.facturas.map((f) => (
          <li key={f.documentoId} className="py-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <span className="flex flex-col text-sm">
                <span className="font-medium">Folio {f.folio ?? "—"}</span>
                <span className="text-fg-muted">
                  Venció {fecha(f.vencimiento)} · {f.atrasoDias} días de atraso
                  {f.pasosEnviados.length ? ` · recordatorio ${Math.max(...f.pasosEnviados)} enviado` : ""}
                </span>
              </span>
              <span className="flex flex-none flex-col items-end gap-1">
                <span className="t-numeric font-medium">{pesos(f.saldo)}</span>
                <span className="flex gap-1">
                  {f.pausada ? <Badge tono="neutro">Pausada</Badge> : null}
                  <Badge tono={TRAMO[f.tramo].tono}>{TRAMO[f.tramo].etiqueta}</Badge>
                </span>
              </span>
            </div>
            {p.gestiona ? (
              <div className="flex flex-wrap gap-2">
                <Button disabled={pendiente} onClick={() => setRecordar(f)}>Enviar recordatorio</Button>
                <Button variant="secondary" disabled={pendiente} onClick={() => void pausar(f)}>
                  {f.pausada ? "Reanudar" : "Pausar"}
                </Button>
                <Button variant="secondary" disabled={pendiente} onClick={() => setNota(f)}>Anotar gestión</Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {recordar ? (
        <Dialog abierto titulo={`Recordatorio · folio ${recordar.folio ?? ""}`} onCerrar={() => setRecordar(null)}>
          {para ? (
            <p className="text-sm">
              Se enviará por correo a <strong>{para}</strong> (con copia a los demás contactos de facturación) la factura
              folio {recordar.folio} por {pesos(recordar.saldo)}, vencida el {fecha(recordar.vencimiento)}, con el PDF adjunto.
            </p>
          ) : (
            <Alerta tono="warning" titulo="Sin contactos de facturación">
              Agrega un contacto con rol facturación y correo en la ficha del cliente para poder enviar el recordatorio.
            </Alerta>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRecordar(null)}>Cancelar</Button>
            <Button disabled={pendiente || !para} onClick={() => void enviar(recordar)}>Enviar correo</Button>
          </div>
        </Dialog>
      ) : null}
      {nota ? (
        <Dialog abierto titulo="Anotar gestión" onCerrar={() => setNota(null)}>
          <Campo etiqueta="Qué se hizo o acordó" htmlFor="gestion-detalle">
            <Textarea id="gestion-detalle" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} />
          </Campo>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNota(null)}>Cancelar</Button>
            <Button disabled={pendiente || texto.trim().length < 3} onClick={() => void anotar(nota)}>Guardar</Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
