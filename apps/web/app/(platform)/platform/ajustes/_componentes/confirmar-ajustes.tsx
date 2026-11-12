"use client";

import { Button, Dialog } from "@opai/ds";

type Props = {
  cambios: number;
  empresas: number;
  pendiente: boolean;
  onCancelar: () => void;
  onGuardar: () => void;
};

/** Confirmación de Ajustes (CAR-323, §2.7): cuántos cambios y a cuántas empresas afectan. Diferida. */
export default function ConfirmarAjustes({
  cambios,
  empresas,
  pendiente,
  onCancelar,
  onGuardar,
}: Props) {
  return (
    <Dialog
      abierto
      onCerrar={onCancelar}
      titulo="¿Guardar los ajustes?"
      descripcion={`${cambios} ${cambios === 1 ? "cambio" : "cambios"} · afecta a ${empresas} ${empresas === 1 ? "empresa" : "empresas"} desde hoy.`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button disabled={pendiente} onClick={onGuardar}>
            Guardar
          </Button>
        </>
      }
    />
  );
}
