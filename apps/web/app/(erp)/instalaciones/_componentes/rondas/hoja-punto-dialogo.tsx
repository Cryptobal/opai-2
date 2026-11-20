import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";

import type { Punto } from "./tipos";

export function DialogoArchivarPunto({
  actual,
  pendiente,
  error,
  onCerrar,
  onConfirmar,
}: {
  actual: Punto;
  pendiente: boolean;
  error: string | null;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <DialogoConfirmar
      confirmacion={{
        titulo: `Archivar ${actual.nombre}`,
        descripcion:
          "El punto deja de ofrecerse en plantillas nuevas. Las rondas pasadas lo conservan.",
        boton: "Archivar",
        peligro: true,
      }}
      pendiente={pendiente}
      error={error}
      onCerrar={onCerrar}
      onConfirmar={onConfirmar}
    />
  );
}