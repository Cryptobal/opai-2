"use client";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** RR. HH. habilita o deshabilita a la persona para marcar desde su teléfono personal (D-01, T-04). */
export function BotonTelefono({ personaId, habilitado }: { personaId: string; habilitado: boolean }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  return (
    <Button
      variant="secondary"
      disabled={pendiente}
      title={error ?? undefined}
      onClick={() => void ejecutar("asistencia.telefono.habilitar", { personaId, habilitado: !habilitado }).then((r) => r && avisar.exito(habilitado ? "Teléfono deshabilitado" : "Teléfono habilitado"))}
    >
      {habilitado ? "Deshabilitar teléfono" : "Habilitar teléfono"}
    </Button>
  );
}
