"use client";

import { Alerta, AuthCard, Button } from "@opai/ds";

import { ETIQUETA_CLASE } from "@/app/_components/firmas/etiquetas";
import { FirmaN1AlertaSinAccion, FirmaN1Botones, FirmaN1CamposEnlace } from "@/app/_components/firmas/firma-n1-campos";
import type { DatosFirma } from "@/app/_components/firmas/tipos";
import { useFirmaN1 } from "@/app/_components/firmas/use-firma-n1";

import { firmarPorEnlace, rechazarPorEnlace, urlDocumentoPorEnlace } from "./acciones";

/** Firmar por enlace personal (firma.md §5, R5, R12, CA2/CA8): revisar, aceptar, firmar o rechazar. */
export function FirmarFlujo({ slug, token, datos }: { slug: string; token: string; datos: DatosFirma }) {
  const ui = useFirmaN1(datos, {
    urlDocumento: () => urlDocumentoPorEnlace(slug, token),
    firmar: (input) => firmarPorEnlace(slug, token, input),
    rechazar: (motivo) => rechazarPorEnlace(slug, token, motivo),
  });

  if (datos.rol !== "firma") {
    return (
      <AuthCard titulo="Copia del documento">
        <Alerta tono="info" titulo="Este enlace es solo de copia">
          No tienes firma pendiente en esta solicitud.
        </Alerta>
      </AuthCard>
    );
  }
  if (ui.sinAccion) {
    return (
      <AuthCard titulo={ui.firmado ? "Firma registrada" : "Este enlace ya no admite firma"}>
        <FirmaN1AlertaSinAccion ui={ui} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo={`Firmar · ${ETIQUETA_CLASE[datos.clase] ?? datos.clase}`}
      subtitulo={`Nivel ${datos.nivel} · huella del documento verificable al completarse`}
      acciones={ui.rechazando ? undefined : <FirmaN1Botones ui={ui} />}
    >
      {ui.error ? <Alerta tono="danger" titulo={ui.error} /> : null}
      {datos.mensaje ? <p className="text-base text-fg-muted">{datos.mensaje}</p> : null}
      <FirmaN1CamposEnlace
        ui={ui}
        idSuffix="-enlace"
        verDocumento={
          <Button variant="secondary" disabled={ui.verificandoDocumento} onClick={() => void ui.verDocumento()}>
            {ui.verificandoDocumento ? "Abriendo…" : "Ver documento"}
          </Button>
        }
      />
    </AuthCard>
  );
}