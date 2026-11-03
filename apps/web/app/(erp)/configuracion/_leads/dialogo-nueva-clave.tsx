import { Button, Dialog } from "@opai/ds";

type Props = {
  abierto: boolean;
  pendiente: boolean;
  onCerrar: () => void;
  onGenerar: () => void;
};

/** Confirmación antes de rotar la clave del formulario web. */
export function DialogoNuevaClave({ abierto, pendiente, onCerrar, onGenerar }: Props) {
  return (
    <Dialog
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Generar nueva clave"
      acciones={
        <>
          <Button variant="ghost" onClick={() => onCerrar()}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={pendiente} onClick={() => onGenerar()}>
            Generar nueva clave
          </Button>
        </>
      }
    >
      <p className="t-body m0">
        La clave anterior dejará de funcionar de inmediato. Deberás actualizar el sitio web con la
        nueva clave.
      </p>
    </Dialog>
  );
}
