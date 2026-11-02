import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";

import { ConfirmarAnulacion } from "./confirmar-anulacion";
import { fechaCl } from "./etiquetas";

export function DialogosExcepcion({
  puestoNombre,
  fecha,
  pendiente,
  error,
  confirmarAnulacion,
  confirmarDeshacer,
  onCerrarAnulacion,
  onCerrarDeshacer,
  onAnular,
  onDeshacer,
}: {
  puestoNombre: string;
  fecha: string;
  pendiente: boolean;
  error: string | null;
  confirmarAnulacion: boolean;
  confirmarDeshacer: boolean;
  onCerrarAnulacion: () => void;
  onCerrarDeshacer: () => void;
  onAnular: () => void;
  onDeshacer: () => void;
}) {
  return (
    <>
      {confirmarAnulacion ? (
        <ConfirmarAnulacion
          puesto={puestoNombre}
          fecha={fecha}
          pendiente={pendiente}
          error={error}
          onCerrar={onCerrarAnulacion}
          onConfirmar={onAnular}
        />
      ) : null}
      {confirmarDeshacer ? (
        <DialogoConfirmar
          confirmacion={{
            titulo: "Deshacer confirmación",
            descripcion: `Se anulará la confirmación operativa de ${puestoNombre} del ${fechaCl(fecha)}.`,
            boton: "Deshacer confirmación",
            peligro: true,
          }}
          pendiente={pendiente}
          error={error}
          onCerrar={onCerrarDeshacer}
          onConfirmar={onDeshacer}
        />
      ) : null}
    </>
  );
}
