"use client";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Crea la dirección de registro de la empresa (`core.correos.crear_direccion`); idempotente. */
export function CrearDireccion() {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        disabled={pendiente}
        onClick={async () => {
          if (await ejecutar("core.correos.crear_direccion", {}))
            avisar.exito("Dirección de registro lista");
        }}
      >
        Crear dirección de registro
      </Button>
      {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
    </div>
  );
}
