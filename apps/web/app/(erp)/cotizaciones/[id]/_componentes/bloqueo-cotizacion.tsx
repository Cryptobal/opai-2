import { Alerta, Button } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import type { BloqueoEnvioCpq } from "./acciones-cotizacion-logica";

/**
 * Aviso compacto de lo que impide avanzar, con la causa concreta (CAR-162): el sueldo de un puesto
 * abre su hoja (acción local), un valor legal lleva a Remuneraciones y la mutual a su confirmación.
 */
export function BloqueoCotizacion({
  bloqueo,
  pendiente,
  onRecalcular,
  onEditarLinea,
}: {
  bloqueo: BloqueoEnvioCpq;
  pendiente: boolean;
  onRecalcular: () => void;
  onEditarLinea?: (lineaId: string) => void;
}) {
  const accion = bloqueo.accion;
  return (
    <Alerta tono="warning" titulo={bloqueo.titulo} className="w-full">
      {bloqueo.mensaje ? <p>{bloqueo.mensaje}</p> : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {accion && onEditarLinea ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => onEditarLinea(accion.lineaId)}
          >
            {accion.etiqueta}
          </Button>
        ) : null}
        {bloqueo.enlace ? (
          <EnlaceBoton
            href={bloqueo.enlace.href}
            variante="secondary"
            className="min-h-11 w-full sm:w-auto"
          >
            {bloqueo.enlace.etiqueta}
          </EnlaceBoton>
        ) : null}
        {bloqueo.recalcular || (accion && !onEditarLinea) ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full sm:w-auto"
            disabled={pendiente}
            onClick={onRecalcular}
          >
            Recalcular
          </Button>
        ) : null}
      </div>
    </Alerta>
  );
}
