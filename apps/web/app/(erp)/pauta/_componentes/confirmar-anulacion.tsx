import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";

import { fechaCl } from "./etiquetas";

export function ConfirmarAnulacion({
  puesto,
  fecha,
  pendiente,
  error,
  onCerrar,
  onConfirmar,
}: {
  puesto: string;
  fecha: string;
  pendiente: boolean;
  error: string | null;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <DialogoConfirmar
      confirmacion={{
        titulo: "Anular excepción",
        descripcion: `Se anulará la excepción de ${puesto} del ${fechaCl(fecha)} y el turno volverá a su serie.`,
        boton: "Anular excepción",
        peligro: true,
      }}
      pendiente={pendiente}
      error={error}
      onCerrar={onCerrar}
      onConfirmar={onConfirmar}
    />
  );
}
