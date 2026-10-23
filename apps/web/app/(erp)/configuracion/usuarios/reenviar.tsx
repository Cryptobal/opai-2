"use client";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Invitacion } from "./usuarios-lista";

/** Reenvía una invitación pendiente: la anterior se revoca y llega un enlace nuevo (72 h). */
export function Reenviar({ i }: { i: Invitacion }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  return (
    <Button
      variant="ghost"
      disabled={pendiente}
      onClick={async () => {
        const r = await ejecutar("core.users.invite", {
          email: i.email,
          rol: i.rol,
          portales: i.portales,
        });
        if (r) avisar.exito(`Invitación reenviada a ${i.email}`);
        else avisar.error("No se pudo reenviar la invitación");
      }}
    >
      Reenviar
    </Button>
  );
}
