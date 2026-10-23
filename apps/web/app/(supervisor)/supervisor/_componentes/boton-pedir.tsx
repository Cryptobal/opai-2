"use client";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Resultado = { enviados: unknown[]; sinCorreo: unknown[] };

/** "Pedir" la renovación de un documento a la persona (por correo, plantilla del núcleo). */
export function BotonPedir({ personaId, tipoId }: { personaId: string; tipoId: string }) {
  const { ejecutar, pendiente } = useCapacidad("supervisor");
  return (
    <Button
      variant="secondary"
      disabled={pendiente}
      onClick={async () => {
        const r = await ejecutar<Resultado>("core.documentos.pedir_renovacion", {
          pedidos: [{ personaId, tipoIds: [tipoId] }],
        });
        if (!r) return avisar.error("No se pudo enviar el pedido");
        if (r.sinCorreo.length) avisar.error("La persona no tiene correo registrado");
        else avisar.exito("Pedido enviado por correo");
      }}
    >
      Pedir
    </Button>
  );
}
