"use client";

import { Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Calculo = { requiereAprobacion?: boolean; noEnviable?: boolean };
type Meta = { avisoRecalculo?: unknown; puedeEnviar?: boolean };

export function AccionesCotizacion({
  cotizacionId,
  version,
  calculo,
  meta,
  gestionar,
  aprobar,
  onHecho,
}: {
  cotizacionId: string;
  version: { estado: string };
  calculo: Calculo;
  meta?: Meta;
  gestionar: boolean;
  aprobar: boolean;
  onHecho: () => void;
}) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  if (!gestionar && !aprobar) return null;
  const req = calculo.requiereAprobacion;
  const bloqueada = version.estado === "en_aprobacion";
  const despues = (r: unknown) => {
    if (r != null) onHecho();
  };
  return (
    <div className="flex flex-wrap gap-2">
      {gestionar && version.estado === "borrador" && req ? (
        <Button
          type="button"
          disabled={pendiente}
          onClick={() => void ejecutar("cpq.cotizaciones.solicitar_aprobacion", { id: cotizacionId }).then(despues)}
        >
          Pedir aprobación
        </Button>
      ) : null}
      {gestionar && version.estado === "borrador" && !req && !calculo.noEnviable ? (
        <Button
          type="button"
          variant="secondary"
          disabled={pendiente}
          onClick={() => void ejecutar("cpq.cotizaciones.marcar_lista", { id: cotizacionId }).then(despues)}
        >
          Dejar lista
        </Button>
      ) : null}
      {aprobar && bloqueada ? (
        <>
          <Button
            type="button"
            disabled={pendiente}
            onClick={() => void ejecutar("cpq.cotizaciones.aprobar", { id: cotizacionId }).then(despues)}
          >
            Aprobar margen
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pendiente}
            onClick={() => {
              const motivo = window.prompt("Motivo del rechazo");
              if (motivo) {
                void ejecutar("cpq.cotizaciones.rechazar_aprobacion", { id: cotizacionId, motivo }).then(despues);
              }
            }}
          >
            Rechazar
          </Button>
        </>
      ) : null}
      {gestionar && meta?.avisoRecalculo ? (
        <Button
          type="button"
          variant="secondary"
          disabled={pendiente}
          onClick={() => void ejecutar("cpq.cotizaciones.calcular", { id: cotizacionId }).then(despues)}
        >
          Recalcular
        </Button>
      ) : null}
      {gestionar && meta?.puedeEnviar ? (
        <Button
          type="button"
          disabled={pendiente}
          onClick={() =>
            window.alert("El envío completo (contacto y PDF) se habilita en la siguiente iteración de la ficha.")
          }
        >
          Enviar
        </Button>
      ) : null}
    </div>
  );
}
