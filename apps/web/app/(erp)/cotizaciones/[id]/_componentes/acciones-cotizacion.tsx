"use client";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { BloqueoCotizacion } from "./bloqueo-cotizacion";

type Calculo = {
  requiereAprobacion?: boolean;
  noEnviable?: boolean;
  advertencias?: string[];
};
type Meta = {
  avisoRecalculo?: unknown;
  puedeEnviar?: boolean;
  puedeAprobarMargen?: boolean;
  motivoNoAprobarMargen?: string | null;
};

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
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  if (!gestionar && !aprobar) return null;
  const req = calculo.requiereAprobacion;
  const bloqueada = version.estado === "en_aprobacion";
  const puedeDecidir = Boolean(meta?.puedeAprobarMargen);
  const motivoBloqueo = meta?.motivoNoAprobarMargen ?? null;
  const muestraAprobacion = aprobar && bloqueada && (puedeDecidir || motivoBloqueo);
  const advertencias = calculo.advertencias ?? [];
  const laboralPendiente =
    Boolean(calculo.noEnviable) &&
    advertencias.some((a) => a.toLowerCase().includes("costo laboral"));
  const bloqueoEnvio =
    gestionar && version.estado === "borrador" && calculo.noEnviable
      ? laboralPendiente
        ? "Completa el costo laboral (motor de sueldos) antes de pedir aprobación o dejar la cotización lista."
        : advertencias.find((a) => a.includes("UF")) ??
          "Hay datos pendientes para calcular la cotización. Recalcula o completa lo que falta."
      : null;

  const despues = (r: unknown, mensaje?: string) => {
    if (r != null) {
      if (mensaje) avisar.exito(mensaje);
      onHecho();
    }
  };

  const pedirAprobacion = () =>
    void ejecutar("cpq.cotizaciones.solicitar_aprobacion", { id: cotizacionId }).then((r) => {
      if (r != null) despues(r, "Pedido de aprobación enviado");
      else avisar.error("No se pudo pedir aprobación. Revisa los avisos de la cotización.");
    });

  return (
    <div className="flex flex-wrap gap-2">
      {bloqueoEnvio ? (
        <BloqueoCotizacion
          mensaje={bloqueoEnvio}
          laboralPendiente={laboralPendiente}
          pendiente={pendiente}
          onRecalcular={() =>
            void ejecutar("cpq.cotizaciones.calcular", { id: cotizacionId }).then((r) =>
              despues(r, r != null ? "Cotización recalculada" : undefined),
            )
          }
        />
      ) : null}
      {gestionar && version.estado === "borrador" && req && !calculo.noEnviable ? (
        <Button type="button" disabled={pendiente} onClick={pedirAprobacion}>
          Pedir aprobación
        </Button>
      ) : null}
      {gestionar && version.estado === "borrador" && !req && !calculo.noEnviable ? (
        <Button
          type="button"
          variant="secondary"
          disabled={pendiente}
          onClick={() =>
            void ejecutar("cpq.cotizaciones.marcar_lista", { id: cotizacionId }).then((r) => {
              if (r != null) despues(r, "Cotización marcada como lista");
              else avisar.error("No se pudo marcar como lista.");
            })
          }
        >
          Dejar lista
        </Button>
      ) : null}
      {muestraAprobacion ? (
        <>
          <Button
            type="button"
            disabled={pendiente || !puedeDecidir}
            title={!puedeDecidir ? (motivoBloqueo ?? undefined) : undefined}
            onClick={() => void ejecutar("cpq.cotizaciones.aprobar", { id: cotizacionId }).then(despues)}
          >
            Aprobar margen
          </Button>
          {!puedeDecidir && motivoBloqueo ? (
            <p className="t-caption text-fg-muted w-full">{motivoBloqueo}</p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            disabled={pendiente || !puedeDecidir}
            title={!puedeDecidir ? (motivoBloqueo ?? undefined) : undefined}
            onClick={() => {
              const motivo = window.prompt("Motivo del rechazo");
              if (motivo) {
                void ejecutar("cpq.cotizaciones.rechazar_aprobacion", {
                  id: cotizacionId,
                  motivo,
                }).then(despues);
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
        <Button type="button" disabled={pendiente} onClick={() => window.alert("El envío completo (contacto y PDF) se habilita en la siguiente iteración de la ficha.")}>
          Enviar
        </Button>
      ) : null}
      {error ? <p className="t-caption text-danger w-full">{error}</p> : null}
    </div>
  );
}
