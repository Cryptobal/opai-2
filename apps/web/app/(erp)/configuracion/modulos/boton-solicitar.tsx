"use client";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** "Solicitar" un módulo a OPAI (core.modules.solicitar); OPAI lo activa desde Plataforma. */
export function BotonSolicitar({ moduloId, nombre }: { moduloId: string; nombre: string }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  return (
    <Button
      variant="secondary"
      disabled={pendiente}
      onClick={async () => {
        if (await ejecutar("core.modules.solicitar", { moduloId }))
          avisar.exito(`Solicitud de ${nombre} enviada a OPAI`);
        else avisar.error("No se pudo enviar la solicitud");
      }}
    >
      {pendiente ? "Enviando…" : "Solicitar"}
    </Button>
  );
}
