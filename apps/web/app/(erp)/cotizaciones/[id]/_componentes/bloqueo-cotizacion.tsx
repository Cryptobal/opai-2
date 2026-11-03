import { Alerta, Button } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

const REMUNERACIONES = "/configuracion/grupo/operacion/remuneraciones";

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
        <div className="mt-2 flex flex-wrap gap-2">
          <EnlaceBoton href={REMUNERACIONES} variante="secondary">
            Ir a Remuneraciones
          </EnlaceBoton>
          <Button type="button" variant="ghost" disabled={pendiente} onClick={onRecalcular}>
            Recalcular
          </Button>
        </div>
      ) : enlace ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <EnlaceBoton href={enlace.href} variante="secondary">
            {enlace.etiqueta}
          </EnlaceBoton>
        </div>
      ) : null}
    </Alerta>
  );
}
