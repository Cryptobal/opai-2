"use client";

import { Alerta, Button } from "@opai/ds";
import { formatearFecha } from "@opai/domain";

import { ETIQUETA_CLASE } from "./etiquetas";
import { FirmaN1AlertaSinAccion, FirmaN1Campos } from "./firma-n1-campos";
import {
  firmarEnSesion,
  rechazarEnSesion,
  urlDocumentoEnSesion,
} from "./acciones-sesion";
import type { DatosFirma } from "./tipos";
import { useFirmaN1 } from "./use-firma-n1";

/** Firmar con sesión del portal (mismo flujo N1 que el enlace del correo, CAR-634). */
export function FirmarSesion({
  portal,
  solicitudId,
  volverHref,
  datos,
}: {
  portal: string;
  solicitudId: string;
  volverHref: string;
  datos: DatosFirma;
}) {
  const ui = useFirmaN1(
    datos,
    {
      urlDocumento: () => urlDocumentoEnSesion(portal, solicitudId),
      firmar: (input) => firmarEnSesion(portal, solicitudId, input),
      rechazar: (motivo) => rechazarEnSesion(portal, solicitudId, motivo),
    },
    volverHref,
  );

  if (datos.rol !== "firma") {
    return (
      <Alerta tono="info" titulo="Este documento es solo de copia">
        No tienes firma pendiente en esta solicitud.
      </Alerta>
    );
  }
  if (ui.sinAccion) {
    return (
      <div className="flex flex-col gap-4">
        <FirmaN1AlertaSinAccion ui={ui} />
        {ui.volver ? (
          <Button variant="secondary" onClick={ui.volver}>
            Volver a la lista
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      {ui.error ? <Alerta tono="danger" titulo={ui.error} /> : null}
      {datos.mensaje ? <p className="text-base text-fg-muted">{datos.mensaje}</p> : null}
      <p className="t-caption">
        {ETIQUETA_CLASE[datos.clase] ?? datos.clase} · Nivel {datos.nivel} · vence{" "}
        {formatearFecha(datos.plazoVence.slice(0, 10))}
      </p>
      <Button variant="secondary" disabled={ui.verificandoDocumento} onClick={() => void ui.verDocumento()}>
        {ui.verificandoDocumento ? "Abriendo…" : "Ver documento"}
      </Button>
      <FirmaN1Campos ui={ui} />
    </div>
  );
}