import { Alerta, Button } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

/** Misma ruta que CAR-150 (#226). */
const REMUNERACIONES = "/configuracion/grupo/operacion/remuneraciones";

/** Aviso cuando `noEnviable`: sin «Pedir aprobación» habilitado (CAR-150 / encargo Carlos 375 px). */
export function BloqueoCotizacion({
  mensaje,
  laboralPendiente,
  pendiente,
  onRecalcular,
  enlace,
  compacto,
}: {
  mensaje: string;
  laboralPendiente: boolean;
  pendiente: boolean;
  onRecalcular?: () => void;
  /** Enlace accionable si el bloqueo no es solo motor laboral (p. ej. sueldo base → cargos). */
  enlace?: { href: string; etiqueta: string };
  compacto?: boolean;
}) {
  const hayAcciones = laboralPendiente || enlace || onRecalcular;
  return (
    <Alerta tono="warning" titulo="Cotización bloqueada" className={compacto ? "w-full" : "w-full max-w-xl"}>
      <p>{mensaje}</p>
      {hayAcciones ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {laboralPendiente ? (
            <EnlaceBoton href={REMUNERACIONES} variante="secondary">
              Ir a Remuneraciones
            </EnlaceBoton>
          ) : enlace ? (
            <EnlaceBoton href={enlace.href} variante="secondary">
              {enlace.etiqueta}
            </EnlaceBoton>
          ) : null}
          {onRecalcular ? (
            <Button type="button" variant="ghost" disabled={pendiente} onClick={onRecalcular}>
              Recalcular
            </Button>
          ) : null}
        </div>
      ) : null}
    </Alerta>
  );
}
