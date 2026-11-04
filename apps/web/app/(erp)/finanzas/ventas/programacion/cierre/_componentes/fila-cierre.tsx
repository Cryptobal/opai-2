"use client";

import { Badge, Button } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fecha, pesos } from "@/lib/fechas";

import type { ItemCierre } from "./tipos";

export type AccionFila = "oc_hes" | "enviada" | "ok" | "observar" | "reabrir";

function detalle(i: ItemCierre): string {
  const base = `${i.programacionNombre} · ${i.periodo}`;
  if (i.etapa === "emitido") return `${base} · Folio ${i.folio ?? "—"}`;
  if (i.etapa === "observado") return `${base} · Observó ${fecha(i.observadaEn)}: ${i.observacion ?? ""}`;
  if (i.etapa === "esperando_ok")
    return `${base} · Enviada ${fecha(i.enviadaEn)}${i.recordadaEn ? ` · recordatorio ${fecha(i.recordadaEn)}` : ""}`;
  if (i.etapa === "listo") return `${base} · OK ${fecha(i.okEn)}`;
  if (i.etapa === "falta_oc_hes") return `${base} · Falta la OC o la HES del cliente`;
  return `${base} · Proforma lista`;
}

/** Una fila del tablero con las acciones que corresponden a su etapa. */
export function FilaCierre(p: {
  item: ItemCierre;
  gestiona: boolean;
  pendiente: boolean;
  onAccion: (a: AccionFila, i: ItemCierre) => void;
}) {
  const { item: i, gestiona, pendiente, onAccion } = p;
  const boton = (a: AccionFila, texto: string, primario = false) => (
    <Button key={a} variant={primario ? "primary" : "secondary"} disabled={pendiente} onClick={() => onAccion(a, i)}>
      {texto}
    </Button>
  );
  const acciones: Record<ItemCierre["etapa"], React.ReactNode[]> = {
    falta_oc_hes: [boton("oc_hes", "Ingresar OC/HES", true)],
    observado: [boton("reabrir", "Reabrir", true)],
    por_enviar: [boton("enviada", "Marcar enviada", true), boton("oc_hes", "OC/HES")],
    esperando_ok: [boton("ok", "Marcar OK", true), boton("enviada", "Recordar"), boton("observar", "Observación")],
    listo: [],
    emitido: [],
  };
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col text-sm">
          <span className="font-medium">{i.cuentaNombre ?? "Cliente sin nombre"}</span>
          <span className="text-fg-muted">{detalle(i)}</span>
          {i.ordenCompra || i.hes ? (
            <span className="text-fg-muted">
              {i.ordenCompra ? `OC ${i.ordenCompra}` : ""}
              {i.ordenCompra && i.hes ? " · " : ""}
              {i.hes ? `HES ${i.hes}` : ""}
            </span>
          ) : null}
        </span>
        <span className="flex flex-none flex-col items-end gap-1">
          <span className="t-numeric font-medium">{pesos(i.montoTotal)}</span>
          {i.etapa === "listo" ? <Badge tono="success">Con OK</Badge> : null}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {gestiona ? acciones[i.etapa] : null}
        {i.etapa === "emitido" ? (
          <LinkNext href={`/finanzas/ventas/${i.documentoId}`} className="inline-flex h-11 items-center text-sm underline md:h-10">
            Ver documento
          </LinkNext>
        ) : null}
      </div>
    </li>
  );
}
