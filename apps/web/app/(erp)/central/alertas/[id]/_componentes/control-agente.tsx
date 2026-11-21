"use client";

import { useRouter } from "next/navigation";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { EventoAlerta } from "../../../_componentes/tipos-central";

type Props = { id: string; estado: string; eventos: EventoAlerta[] };

function tomadaPorOperador(eventos: EventoAlerta[]) {
  let tomada = false;
  for (const e of eventos) {
    if (e.tipo === "devuelta") tomada = false;
    if (e.tipo === "tomada") tomada = true;
  }
  return tomada;
}

/** Tomar o devolver el control del agente en la alerta (R13). */
export function ControlAgente({ id, estado, eventos }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente } = useCapacidad("erp");
  const activa = ["nueva", "en_contacto", "escalada", "en_atencion", "pospuesta"].includes(estado);
  const tomada = tomadaPorOperador(eventos);
  if (!activa) return null;

  async function tomar() {
    if (await ejecutar("central.alertas.tomar", { id })) {
      avisar.exito("Control tomado");
      router.refresh();
    }
  }
  async function devolver() {
    if (await ejecutar("central.alertas.devolver", { id })) {
      avisar.exito("Control devuelto al agente");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
      {!tomada && estado !== "pospuesta" ? (
        <Button variant="secondary" disabled={pendiente} onClick={() => void tomar()}>
          Tomar control del agente
        </Button>
      ) : null}
      {tomada ? (
        <Button variant="secondary" disabled={pendiente} onClick={() => void devolver()}>
          Devolver al agente
        </Button>
      ) : null}
    </div>
  );
}