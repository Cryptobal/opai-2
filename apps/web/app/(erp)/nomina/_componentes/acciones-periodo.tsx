"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Dialog, Input } from "@opai/ds";
import type { EstadoPeriodo } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Periodo } from "./tipos";

type Paso = { a: "en_revision" | "cerrado" | "abierto"; texto: string; retroceso: boolean };
const PASOS: Record<EstadoPeriodo, Paso[]> = {
  abierto: [{ a: "en_revision", texto: "Pasar a revisión", retroceso: false }],
  en_revision: [
    { a: "cerrado", texto: "Cerrar período", retroceso: false },
    { a: "abierto", texto: "Devolver a abierto", retroceso: true },
  ],
  cerrado: [{ a: "en_revision", texto: "Reabrir para revisión", retroceso: true }],
  pagado: [],
};

/** Acciones del período según su estado: avanzar, devolver con motivo y marcar pagado (irreversible). */
export function AccionesPeriodo({ periodo, puedePagar }: { periodo: Periodo; puedePagar: boolean }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [devolver, setDevolver] = useState<Paso | null>(null);
  const [motivo, setMotivo] = useState("");
  const [pagar, setPagar] = useState(false);

  async function cambiar(paso: Paso) {
    const r = await ejecutar("nomina.periodos.cambiar_estado", {
      id: periodo.id,
      a: paso.a,
      ...(paso.retroceso ? { motivo: motivo.trim() } : {}),
    });
    if (r) {
      avisar.exito(`${periodo.etiqueta}: ${paso.texto.toLowerCase()}`);
      setDevolver(null);
      setMotivo("");
    }
  }
  async function marcarPagado() {
    if (await ejecutar("nomina.periodos.marcar_pagado", { id: periodo.id })) {
      avisar.exito(`${periodo.etiqueta} quedó pagado`);
      setPagar(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PASOS[periodo.estado].map((p) => (
        <Button
          key={p.a}
          variant={p.retroceso ? "ghost" : "secondary"}
          disabled={pendiente}
          onClick={() => (p.retroceso ? (limpiarError(), setDevolver(p)) : void cambiar(p))}
        >
          {p.texto}
        </Button>
      ))}
      {periodo.estado === "cerrado" && puedePagar ? (
        <Button disabled={pendiente} onClick={() => (limpiarError(), setPagar(true))}>
          Marcar pagado
        </Button>
      ) : null}
      {error && !devolver && !pagar ? <Alerta tono="danger" titulo={error} className="w-full" /> : null}
      <Dialog
        abierto={devolver !== null}
        onCerrar={() => setDevolver(null)}
        titulo={devolver?.texto ?? ""}
        descripcion="Queda registrado con tu motivo en la auditoría."
        acciones={
          <Button disabled={pendiente || motivo.trim().length < 5} onClick={() => devolver && void cambiar(devolver)}>
            Confirmar
          </Button>
        }
      >
        <Input aria-label="Motivo" placeholder="Motivo (mínimo 5 caracteres)" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        {error ? <Alerta tono="danger" titulo={error} className="mt-3" /> : null}
      </Dialog>
      <Dialog
        abierto={pagar}
        onCerrar={() => setPagar(false)}
        titulo={`Marcar ${periodo.etiqueta} como pagado`}
        descripcion="Es el acto final del mes y no se deshace: el período no admitirá más cambios."
        acciones={<Button disabled={pendiente} onClick={() => void marcarPagado()}>Sí, marcar pagado</Button>}
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </Dialog>
    </div>
  );
}
