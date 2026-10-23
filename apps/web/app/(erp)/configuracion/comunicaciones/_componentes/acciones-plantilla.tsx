"use client";

import { Mail } from "lucide-react";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** "Enviar prueba a mi correo" (31): la plantilla vigente con datos de ejemplo. */
export function EnviarPrueba({ evento }: { evento: string }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  return (
    <Button
      variant="secondary"
      disabled={pendiente}
      onClick={async () => {
        const r = await ejecutar<{ enviado: boolean; para: string }>(
          "core.plantillas.enviar_prueba",
          { evento },
        );
        if (!r) avisar.error("No se pudo enviar la prueba");
        else if (r.enviado) avisar.exito(`Prueba enviada a ${r.para}`);
        else avisar.info(`Sin correo configurado: la prueba para ${r.para} quedó en el registro`);
      }}
    >
      <Mail className="size-4" aria-hidden /> Enviar prueba a mi correo
    </Button>
  );
}

type PropsRestablecer = { evento: string; canal: string; asunto: string; cuerpo: string };

/** Vuelve a la plantilla de OPAI (las versiones editadas quedan en el historial). */
export function Restablecer({ evento, canal, asunto, cuerpo }: PropsRestablecer) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  return (
    <Button
      variant="ghost"
      disabled={pendiente}
      onClick={async () => {
        // La capacidad pide asunto y cuerpo aunque restablezca: van los vigentes.
        const r = await ejecutar("core.plantillas.update", {
          evento,
          canal,
          asunto,
          cuerpo,
          restablecer: true,
        });
        if (r) avisar.exito("Se usa otra vez la plantilla de OPAI");
        else avisar.error("No se pudo restablecer la plantilla");
      }}
    >
      Volver a la de OPAI
    </Button>
  );
}
