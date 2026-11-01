"use client";

import { avisar } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { VinculoContacto } from "./vinculos-tipos";

export function DesvincularContacto({
  vinculo: v,
  onCerrar,
}: {
  vinculo: VinculoContacto;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function confirmar() {
    const r = await ejecutar("core.contactos.desvincular", {
      contactoId: v.contactoId,
      cuentaId: v.cuentaId,
    });
    if (!r) return;
    avisar.exito("Contacto desvinculado");
    onCerrar();
  }
  return (
    <DialogoConfirmar
      pendiente={pendiente}
      error={error}
      onCerrar={() => {
        if (!pendiente) onCerrar();
      }}
      onConfirmar={() => void confirmar()}
      confirmacion={{
        titulo: "Desvincular contacto",
        boton: "Desvincular",
        peligro: true,
        descripcion: `Se perderán el cargo y los roles en ${v.cuentaNombre}. Esta acción es irreversible. El contacto debe conservar otra cuenta y no participar en negocios de esta cuenta.`,
      }}
    />
  );
}
