"use client";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Retira una solicitud propia que la jefatura todavía no responde (CAR-464). */
export function BotonRetirar({ id }: { id: string }) {
  const { ejecutar, pendiente } = useCapacidad("trabajador");
  async function retirar() {
    const r = await ejecutar("portal_trabajador.solicitudes.cancelar", { id });
    if (r) avisar.exito("Retiraste la solicitud.");
    else avisar.error("No se pudo retirar. Inténtalo de nuevo.");
  }
  return (
    <Button type="button" variant="secondary" disabled={pendiente} onClick={() => void retirar()}>
      {pendiente ? "Retirando…" : "Retirar"}
    </Button>
  );
}
