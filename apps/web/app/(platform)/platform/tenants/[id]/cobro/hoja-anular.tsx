"use client";

import { Alerta, Button, Campo, Input, Sheet } from "@opai/ds";

import { type Cargo, clp, nombreMes } from "../../../facturacion/_componentes/cobro";

/** Hoja para anular un cargo con su motivo (se descarga al abrirla). */
export function HojaAnular(props: {
  anular: Cargo;
  nombre: string;
  motivo: string;
  setMotivo: (m: string) => void;
  pendiente: boolean;
  error: string | null;
  onConfirmar: () => void;
  onCerrar: () => void;
}) {
  const { anular, nombre, motivo, setMotivo, pendiente, error, onConfirmar, onCerrar } = props;
  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo="Anular cargo"
      descripcion={`${nombre} · ${nombreMes(anular.periodo)} · ${clp(anular.montoClp)}`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={pendiente || motivo.trim().length < 3}
            onClick={onConfirmar}
          >
            Anular cargo
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <p className="text-base text-fg">
          El cargo deja de estar listo para facturar. Después puedes volver a generar el mes.
        </p>
        <Campo etiqueta="Motivo" htmlFor="motivo">
          <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}
