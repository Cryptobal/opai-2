"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import dynamic from "next/dynamic";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

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
      {activa && estado !== "en_atencion" && estado !== "pospuesta" ? (
        <Button variant="primary" disabled={pendiente} onClick={() => correr(ejecutar("central.alertas.hacerse_cargo", { id }), "Quedaste a cargo")}>
          Me hago cargo
        </Button>
      ) : null}
      {activa ? (
        <>
          {estado !== "pospuesta" ? (
            <Button variant={estado === "en_atencion" ? "primary" : "secondary"} disabled={pendiente} onClick={() => setDialogo("resolver")}>
              Resolver
            </Button>
          ) : null}
          <Button variant="secondary" disabled={pendiente} onClick={() => setDialogo("falsa_alarma")}>
            Falsa alarma
          </Button>
          {estado !== "pospuesta" ? (
            <Button variant="secondary" disabled={pendiente} onClick={() => setDialogo("posponer")}>
              Posponer
            </Button>
          ) : null}
          {estado !== "pospuesta" ? (
            <Button variant="secondary" disabled={pendiente} onClick={() => correr(ejecutar("central.alertas.escalar", { id }), "Alerta escalada")}>
              Escalar
            </Button>
          ) : null}
        </>
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
