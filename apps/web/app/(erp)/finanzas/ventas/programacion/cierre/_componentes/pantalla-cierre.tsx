"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { NOMBRE_ETAPA } from "@opai/domain";
import { Alerta, avisar, Button, Empty, Estado, Tabs, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

import { mesVecino, RUTA_CIERRE } from "./meses";
import { type AccionFila, FilaCierre } from "./fila-cierre";
import { enviarLoteAlSii } from "../../../_componentes/enviar-sii-tras-emitir";
import type { ItemCierre, ResultadoLote, TableroCierre } from "./tipos";

const DialogoLote = dynamic(() => import("./dialogos-cierre").then((m) => ({ default: m.DialogoLote })));
const DialogoObservar = dynamic(() => import("./dialogos-cierre").then((m) => ({ default: m.DialogoObservar })));
const DialogoOcHes = dynamic(() => import("./dialogos-cierre").then((m) => ({ default: m.DialogoOcHes })));

const PESTANAS = [
  { id: "plantillas", etiqueta: "Plantillas", href: "/finanzas/ventas/programacion" },
  { id: "tablero", etiqueta: "Tablero del mes", href: RUTA_CIERRE },
] as const;

const mesLargo = (p: string) => {
  const [a, m] = p.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
};

type Props = { state: EstadoPantalla; periodo: string; tablero: TableroCierre | null; gestiona: boolean };

/** Cierre de mes: etapas del período y emisión en lote (diseño Finanzas v3, «Programación y cierre»). */
export function PantallaCierre({ state, periodo, tablero, gestiona }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const intento = useRef(crypto.randomUUID());
  const [dialogo, setDialogo] = useState<{ tipo: "oc_hes" | "observar"; item: ItemCierre } | null>(null);
  const [lote, setLote] = useState<ResultadoLote | null>(null);
  const items = tablero?.items ?? [];
  const todosListos = items.filter((i) => i.emitible);
  const listos = todosListos.slice(0, 50); // el lote admite hasta 50 por aprobación

  async function aplicar(item: ItemCierre, cambio: Record<string, unknown>, aviso: string) {
    const r = await ejecutar("finanzas.cierre.actualizar", { documentoId: item.documentoId, cambio });
    setDialogo(null);
    if (r) avisar.exito(aviso);
  }
  function accion(a: AccionFila, item: ItemCierre) {
    if (a === "oc_hes" || a === "observar") return setDialogo({ tipo: a, item });
    const mapa = {
      enviada: [{ accion: "marcar_enviada" }, item.etapa === "esperando_ok" ? "Recordatorio anotado" : "Proforma marcada como enviada"],
      ok: [{ accion: "marcar_ok" }, "OK del cliente registrado"],
      reabrir: [{ accion: "reabrir" }, "Documento reabierto"],
    } as const;
    const [cambio, aviso] = mapa[a];
    void aplicar(item, cambio, aviso);
  }
  async function revisarLote() {
    const r = await ejecutar<ResultadoLote>("finanzas.cierre.emitir_lote", { documentoIds: listos.map((i) => i.documentoId) }, true);
    if (r) setLote(r);
  }
  async function emitirLote() {
    const r = await ejecutar<ResultadoLote>(
      "finanzas.cierre.emitir_lote", { documentoIds: listos.map((i) => i.documentoId) }, false, "layout", `cierre-${periodo}-${listos.map((i) => i.documentoId.slice(0, 8)).join("")}-${intento.current}`,
    );
    setLote(null);
    if (r) {
      intento.current = crypto.randomUUID();
      await enviarLoteAlSii(r.resultados.filter((x) => x.estado === "emitido").map((x) => x.documentoId));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs Link={LinkNext} activa="tablero" tabs={PESTANAS} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <EnlaceBoton href={`${RUTA_CIERRE}?periodo=${mesVecino(periodo, -1)}`} variante="secondary" etiqueta="Mes anterior">←</EnlaceBoton>
          <h2 className="t-heading capitalize">{mesLargo(periodo)}</h2>
          <EnlaceBoton href={`${RUTA_CIERRE}?periodo=${mesVecino(periodo, 1)}`} variante="secondary" etiqueta="Mes siguiente">→</EnlaceBoton>
        </div>
        {gestiona && listos.length ? (
          <Button disabled={pendiente} onClick={() => void revisarLote()}>Emitir {listos.length} listos{todosListos.length > listos.length ? ` de ${todosListos.length}` : ""}</Button>
        ) : null}
      </div>
      {error ? <Alerta tono="danger" titulo="No se pudo completar">{error}</Alerta> : null}
      <Estado state={state} variante="lista">
        {items.length === 0 ? (
          <Empty titulo="Sin borradores en este mes" descripcion="Los borradores aparecen cuando una plantilla activa los genera. Revisa las plantillas o cambia de mes." />
        ) : (
          tablero?.etapas.filter((e) => e.cantidad > 0).map((e) => (
            <section key={e.etapa} aria-label={NOMBRE_ETAPA[e.etapa]} className="flex flex-col">
              <h3 className="t-body-sm flex justify-between font-medium">
                <span>{NOMBRE_ETAPA[e.etapa]} · {e.cantidad}</span>
                <span className="t-numeric text-fg-muted">{pesos(e.total)}</span>
              </h3>
              <ul className="divide-y divide-border">
                {items.filter((i) => i.etapa === e.etapa).map((i) => (
                  <FilaCierre key={i.documentoId} item={i} gestiona={gestiona} pendiente={pendiente} onAccion={accion} />
                ))}
              </ul>
            </section>
          ))
        )}
      </Estado>
      {dialogo?.tipo === "oc_hes" ? (
        <DialogoOcHes item={dialogo.item} pendiente={pendiente} onCerrar={() => setDialogo(null)}
          onGuardar={(v) => void aplicar(dialogo.item, { accion: "registrar_oc_hes", ...v }, "OC/HES guardadas")} />
      ) : null}
      {dialogo?.tipo === "observar" ? (
        <DialogoObservar pendiente={pendiente} onCerrar={() => setDialogo(null)}
          onGuardar={(t) => void aplicar(dialogo.item, { accion: "observar", observacion: t }, "Observación registrada")} />
      ) : null}
      {lote ? (
        <DialogoLote items={listos} vista={lote} pendiente={pendiente} onCerrar={() => setLote(null)} onEmitir={() => void emitirLote()} />
      ) : null}
    </div>
  );
}
