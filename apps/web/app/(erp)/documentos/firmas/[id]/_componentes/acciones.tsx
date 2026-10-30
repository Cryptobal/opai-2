"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

/** Recordar y cancelar (firma.md §8, R4, CA6): acciones de quien envió sobre una solicitud viva. */
export function AccionesSolicitud({ id, puedeGestionar, viva }: {
  id: string;
  puedeGestionar: boolean;
  viva: boolean;
}) {
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [cancelar, setCancelar] = useState(false);
  if (!puedeGestionar || !viva) return null;
  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        disabled={pendiente}
        onClick={async () => {
          const r = await ejecutar<{ recordados: number }>("core.firmas.recordar", { id });
          if (r) avisar.exito(r.recordados === 1 ? "Recordatorio enviado" : `${r.recordados} recordatorios enviados`);
        }}
      >
        Recordar
      </Button>
      <Button variant="destructive" disabled={pendiente} onClick={() => setCancelar(true)}>
        Cancelar
      </Button>
      {cancelar ? (
        <DialogoConfirmar
          confirmacion={{
            titulo: "Cancelar solicitud de firma",
            descripcion: "Se avisa a los firmantes; la solicitud queda cancelada y no se reenvía.",
            boton: "Cancelar solicitud",
            peligro: true,
            motivo: true,
          }}
          pendiente={pendiente}
          error={error}
          onCerrar={() => {
            limpiarError();
            setCancelar(false);
          }}
          onConfirmar={async (motivo) => {
            if (await ejecutar("core.firmas.cancelar", { id, motivo })) {
              avisar.exito("Solicitud cancelada");
              setCancelar(false);
              router.refresh();
            }
          }}
        />
      ) : null}
    </div>
  );
}
