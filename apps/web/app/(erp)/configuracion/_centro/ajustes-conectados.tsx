"use client";

import { AjustesForm, avisar, type CampoAjusteVista } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = {
  campos: CampoAjusteVista[];
  valores: Record<string, { valor: unknown; origen: string }>;
};

/** `AjustesForm` del DS conectado a `core.config.set` (un llamado por campo cambiado; null restablece). */
export function AjustesConectados({ campos, valores }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  return (
    <AjustesForm
      campos={campos}
      valores={valores}
      pendiente={pendiente}
      error={error}
      onGuardar={async (cambios) => {
        for (const c of cambios) if (!(await ejecutar("core.config.set", c))) return false;
        avisar.exito(
          cambios.length === 1 ? "Ajuste guardado" : `${cambios.length} ajustes guardados`,
        );
        return true;
      }}
      onRestablecer={async (c) => {
        if (await ejecutar("core.config.set", { modulo: c.modulo, clave: c.clave, valor: null }))
          avisar.exito("Valor por defecto restablecido");
      }}
    />
  );
}
