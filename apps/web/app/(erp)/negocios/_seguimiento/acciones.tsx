"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Select, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { PlanOpcion } from "./datos";

/** Iniciar el seguimiento con un plan; si ya hay uno vivo, lo reemplaza (R: uno por negocio). */
export function IniciarSeguimiento({ negocioId, planes, reemplaza }: { negocioId: string; planes: PlanOpcion[]; reemplaza: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [planId, setPlanId] = useState(planes.find((p) => p.porDefecto)?.id ?? planes[0]?.id ?? "");
  async function iniciar() {
    const r = await ejecutar("comercial.seguimientos.iniciar", { negocioId, planId, reemplazar: reemplaza });
    if (!r) return;
    avisar.exito("Seguimiento iniciado");
    setAbierta(false);
  }
  return (
    <>
      <Button onClick={() => setAbierta(true)}>{reemplaza ? "Cambiar de plan" : "Iniciar seguimiento"}</Button>
      <Sheet
        abierto={abierta}
        onCerrar={() => setAbierta(false)}
        titulo="Iniciar seguimiento"
        descripcion="Los pasos se agendan en días hábiles, con los feriados de tu empresa."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierta(false)}>Cancelar</Button>
            <Button disabled={pendiente || !planId} onClick={() => void iniciar()}>{pendiente ? "Iniciando…" : "Iniciar"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          {reemplaza ? <Alerta tono="warning" titulo="El seguimiento en curso se reemplaza" /> : null}
          <Campo etiqueta="Plan" htmlFor="seg-plan">
            <Select id="seg-plan" valor={planId || undefined} onCambiar={setPlanId} opciones={planes.map((p) => ({ valor: p.id, etiqueta: `${p.nombre} · ${p.pasos} pasos` }))} />
          </Campo>
        </div>
      </Sheet>
    </>
  );
}

/** Pausar, reanudar, cancelar y «El cliente respondió» del seguimiento vivo. */
export function BarraSeguimiento({ id, estado }: { id: string; estado: string }) {
  const [abierta, setAbierta] = useState(false);
  const [detalle, setDetalle] = useState("");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function controlar(accion: "pausar" | "reanudar" | "cancelar") {
    const r = await ejecutar("comercial.seguimientos.controlar", { id, accion });
    if (r) avisar.exito(accion === "reanudar" ? "Seguimiento reanudado" : accion === "pausar" ? "Seguimiento pausado" : "Seguimiento cancelado");
  }
  async function respondio() {
    const r = await ejecutar("comercial.seguimientos.registrar_respuesta", { id, ...(detalle.trim() ? { detalle: detalle.trim() } : {}) });
    if (!r) return;
    avisar.exito("Anotado: el seguimiento queda en pausa");
    setAbierta(false);
    setDetalle("");
  }
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {estado === "activo" ? <Button onClick={() => setAbierta(true)}>El cliente respondió</Button> : null}
        {estado === "activo" ? <Button variant="secondary" disabled={pendiente} onClick={() => void controlar("pausar")}>Pausar</Button> : <Button disabled={pendiente} onClick={() => void controlar("reanudar")}>Reanudar</Button>}
        <Button variant="secondary" disabled={pendiente} onClick={() => void controlar("cancelar")}>Cancelar</Button>
      </div>
      <Sheet
        abierto={abierta}
        onCerrar={() => setAbierta(false)}
        titulo="El cliente respondió"
        descripcion="El seguimiento queda en pausa hasta que decidas qué sigue."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierta(false)}>Cancelar</Button>
            <Button disabled={pendiente} onClick={() => void respondio()}>{pendiente ? "Guardando…" : "Registrar"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <Campo etiqueta="Qué dijo (opcional)" htmlFor="seg-resp">
            <Textarea id="seg-resp" rows={3} maxLength={1000} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
          </Campo>
        </div>
      </Sheet>
    </>
  );
}

export { BotonesPaso } from "./acciones-paso";
