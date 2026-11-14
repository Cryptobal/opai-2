"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Dialog, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { SecretoDestino } from "../secreto-destino";

type Confirmar = "rotar" | "eliminar" | null;

/** Pausar o reanudar, rotar el secreto y eliminar un destino de eventos (CAR-352). */
export function AccionesDestino({ id, activo }: { id: string; activo: boolean }) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [confirmar, setConfirmar] = useState<Confirmar>(null);
  const [secreto, setSecreto] = useState<string | null>(null);

  async function pausar() {
    if (await ejecutar("core.webhooks.destino_actualizar", { id, activo: !activo })) {
      avisar.exito(activo ? "Destino pausado" : "Destino reanudado");
    }
  }
  async function rotar() {
    const r = await ejecutar<{ secreto: string | null }>("core.webhooks.destino_rotar_secreto", {
      id,
    });
    if (!r?.secreto) return;
    setConfirmar(null);
    setSecreto(r.secreto);
  }
  async function eliminar() {
    if (!(await ejecutar("core.webhooks.destino_eliminar", { id }))) return;
    avisar.exito("Destino eliminado");
    router.push("/configuracion/agentes/eventos");
  }

  return (
    <SeccionTarjeta titulo="Acciones">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente} onClick={() => void pausar()}>
          {activo ? "Pausar" : "Reanudar"}
        </Button>
        <Button variant="secondary" onClick={() => setConfirmar("rotar")}>
          Rotar secreto
        </Button>
        <Button variant="destructive" onClick={() => setConfirmar("eliminar")}>
          Eliminar
        </Button>
      </div>
      <p className="t-caption mt-2">
        {activo
          ? "Si lo pausas, deja de recibir eventos hasta que lo reanudes."
          : "Mientras está pausado no recibe eventos; lo que pase entretanto no se reenvía al reanudarlo."}
      </p>
      <Dialog
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={confirmar === "rotar" ? "¿Rotar el secreto?" : "¿Eliminar este destino?"}
        descripcion={
          error ??
          (confirmar === "rotar"
            ? "El secreto actual deja de valer al instante: actualízalo en tu sistema."
            : "Se borra junto con su registro de entregas. No se puede deshacer.")
        }
        acciones={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(null)}>
              Cancelar
            </Button>
            <Button
              variant={confirmar === "rotar" ? "primary" : "destructive"}
              disabled={pendiente}
              onClick={() => void (confirmar === "rotar" ? rotar() : eliminar())}
            >
              {confirmar === "rotar" ? "Rotar" : "Eliminar"}
            </Button>
          </>
        }
      />
      <SecretoDestino secreto={secreto} titulo="Secreto nuevo" onCerrar={() => setSecreto(null)} />
    </SeccionTarjeta>
  );
}
