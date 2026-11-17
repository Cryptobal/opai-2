"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import dynamic from "next/dynamic";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { GrupoBotonesActivos } from "./grupo-botones";
import type { ConNota } from "./dialogos";

const DialogosAlerta = dynamic(() => import("./dialogos"));

type Props = { id: string; estado: string };

const ACTIVOS = new Set(["nueva", "en_contacto", "escalada", "en_atencion", "pospuesta"]);

/** Acciones de la alerta (spec §6): cada botón llama a la misma capacidad que el MCP. */
export function AccionesAlerta({ id, estado }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [dialogo, setDialogo] = useState<ConNota | "posponer" | null>(null);
  const activa = ACTIVOS.has(estado);

  async function correr(llamada: Promise<unknown>, exito: string) {
    if (await llamada) {
      avisar.exito(exito);
      setDialogo(null);
      router.refresh();
    }
  }
  function conNota(accion: ConNota, nota: string) {
    if (accion === "resolver") return ejecutar("central.alertas.resolver", { id, nota });
    if (accion === "falsa_alarma") return ejecutar("central.alertas.falsa_alarma", { id, nota });
    return ejecutar("central.alertas.reabrir", { id, nota });
  }
  const cerrar = () => {
    limpiarError();
    setDialogo(null);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {activa ? (
        <GrupoBotonesActivos
          estado={estado}
          pendiente={pendiente}
          onCargo={() => correr(ejecutar("central.alertas.hacerse_cargo", { id }), "Quedaste a cargo")}
          onResolver={() => setDialogo("resolver")}
          onFalsa={() => setDialogo("falsa_alarma")}
          onPosponer={() => setDialogo("posponer")}
          onEscalar={() => correr(ejecutar("central.alertas.escalar", { id }), "Alerta escalada")}
        />
      ) : (
        <Button variant="secondary" disabled={pendiente} onClick={() => setDialogo("reabrir")}>
          Reabrir
        </Button>
      )}

      {error && !dialogo ? (
        <p role="alert" className="w-full text-base text-danger">
          {error}
        </p>
      ) : null}
      {dialogo ? (
        <DialogosAlerta
          dialogo={dialogo}
          pendiente={pendiente}
          error={error}
          onCerrar={cerrar}
          onNota={(accion, nota, exito) => correr(conNota(accion, nota), exito)}
          onPosponer={(minutos) => correr(ejecutar("central.alertas.posponer", { id, minutos }), "Alerta pospuesta")}
        />
      ) : null}
    </div>
  );
}