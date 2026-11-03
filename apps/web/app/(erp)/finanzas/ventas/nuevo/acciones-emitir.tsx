import { Alerta, Button } from "@opai/ds";

type Props = {
  pendiente: boolean;
  formOk: boolean;
  hayDocumento: boolean;
  onCancelar: () => void;
  onRevisar: () => void;
  onGuardar: () => void;
};

/** Botonera del formulario de emisión: cancelar, revisar borrador y guardar borrador. */
export function AccionesEmitir({
  pendiente,
  formOk,
  hayDocumento,
  onCancelar,
  onRevisar,
  onGuardar,
}: Props) {
  const bloqueado = pendiente || !formOk || hayDocumento;
  return (
    <>
      <Button variant="secondary" disabled={pendiente} onClick={onCancelar}>
        Cancelar
      </Button>
      <Button variant="secondary" disabled={bloqueado} onClick={onRevisar}>
        Revisar borrador
      </Button>
      <Button disabled={bloqueado} onClick={onGuardar}>
        Guardar borrador
      </Button>
    </>
  );
}

type PropsAlertas = {
  error: string | null;
  preflightBloqueante: string | null;
  cuentaSinRut: boolean;
};

/** Avisos del formulario: error de la capacidad, preflight bloqueante y cuenta sin RUT. */
export function AlertasEmitir({ error, preflightBloqueante, cuentaSinRut }: PropsAlertas) {
  return (
    <>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {preflightBloqueante ? (
        <Alerta tono="warning" titulo="Emisión no lista">
          {preflightBloqueante}
        </Alerta>
      ) : null}
      {cuentaSinRut ? (
        <Alerta tono="warning" titulo="La cuenta seleccionada no tiene RUT">
          Complete el RUT del cliente antes de emitir un DTE.
        </Alerta>
      ) : null}
    </>
  );
}
