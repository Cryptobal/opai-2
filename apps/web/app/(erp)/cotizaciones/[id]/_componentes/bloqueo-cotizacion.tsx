import { Alerta, Button } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

const REMUNERACIONES = "/configuracion/remuneraciones";

export function BloqueoCotizacion({
  mensaje,
  laboralPendiente,
  pendiente,
  onRecalcular,
  enlace,
}: {
  mensaje: string;
  laboralPendiente: boolean;
  pendiente: boolean;
  onRecalcular: () => void;
  enlace?: { href: string; etiqueta: string };
}) {
  return (
    <Alerta tono="warning" titulo="Cotización bloqueada" className="w-full">
      <p>{mensaje}</p>
      {laboralPendiente ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <EnlaceBoton href={REMUNERACIONES} variante="secondary" className="min-h-11 w-full sm:w-auto">
            Ir a Remuneraciones
          </EnlaceBoton>
          <Button type="button" variant="ghost" className="min-h-11 w-full sm:w-auto" disabled={pendiente} onClick={onRecalcular}>
            Recalcular
          </Button>
        </div>
      ) : enlace ? (
        <div className="mt-3">
          <EnlaceBoton href={enlace.href} variante="secondary" className="min-h-11 w-full sm:w-auto">
            {enlace.etiqueta}
          </EnlaceBoton>
        </div>
      ) : null}
    </Alerta>
  );
}
