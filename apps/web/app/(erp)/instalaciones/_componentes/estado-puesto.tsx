"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { Puesto } from "@/lib/tipos-maestros";

/** Desactivar o reactivar un puesto desde su hoja (con confirmación al desactivar). */
export function EstadoPuesto({ puesto, onCerrar }: { puesto: Puesto; onCerrar: () => void }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [confirmar, setConfirmar] = useState(false);
  const activo = puesto.estado === "activo";
  async function cambiarEstado(estado: "activo" | "inactivo") {
    const r = await ejecutar("core.puestos.set_estado", { id: puesto.id, estado });
    if (r) {
      avisar.exito(estado === "inactivo" ? "Puesto desactivado" : "Puesto reactivado");
      onCerrar();
    }
  }
  return (
    <>
      <Button
        variant={activo ? "destructive" : "secondary"}
        block
        disabled={pendiente}
        onClick={() => (activo ? setConfirmar(true) : void cambiarEstado("activo"))}
      >
        {activo ? "Desactivar puesto" : "Reactivar puesto"}
      </Button>
      {confirmar ? (
        <DialogoConfirmar
          confirmacion={{
            titulo: `¿Desactivar «${puesto.nombre}»?`,
            descripcion:
              "Dejará de aparecer en la pauta y la persona asignada quedará sin puesto. Podrás reactivarlo cuando quieras.",
            boton: "Desactivar puesto",
            peligro: true,
          }}
          pendiente={pendiente}
          error={error}
          onCerrar={() => setConfirmar(false)}
          onConfirmar={() => void cambiarEstado("inactivo")}
        />
      ) : null}
    </>
  );
}
