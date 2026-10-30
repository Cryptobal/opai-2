"use client";

import { useState } from "react";

import { Alerta, AuthCard, Button, Campo, Checkbox, Input } from "@opai/ds";

import { type DatosFirma, firmarPorEnlace, rechazarPorEnlace } from "./acciones";

const TEXTO_ACEPTACION =
  "Acepto firmar este documento electrónicamente y declaro que la información que entrego es mía.";
const VERSION_ACEPTACION = "2026-10";

const ETIQUETA_CLASE: Record<string, string> = {
  contrato_trabajo: "Contrato de trabajo",
  anexo_contrato: "Anexo de contrato",
  recepcion_laboral: "Recepción laboral",
  carta_trabajador: "Carta al trabajador",
  propuesta_comercial: "Propuesta comercial",
  contrato_servicio: "Contrato de servicio",
  acta: "Acta",
  acta_reunion: "Acta de reunión",
};

/** Firmar por enlace personal (firma.md §5, R5, R12, CA2/CA8): revisar, aceptar, firmar o rechazar. */
export function FirmarFlujo({ slug, token, datos }: { slug: string; token: string; datos: DatosFirma }) {
  const [nombre, setNombre] = useState(datos.nombre);
  const [acepta, setAcepta] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<"firmado" | "rechazado" | null>(null);

  if (datos.rol !== "firma") {
    return (
      <AuthCard titulo="Copia del documento">
        <Alerta tono="info" titulo="Este enlace es solo de copia">
          No tienes firma pendiente en esta solicitud.
        </Alerta>
      </AuthCard>
    );
  }
  if (listo || datos.estadoFirmante !== "pendiente" || datos.estadoSolicitud !== "enviada" && datos.estadoSolicitud !== "en_curso") {
    const firmado = listo === "firmado" || datos.estadoFirmante === "firmado";
    return (
      <AuthCard titulo={firmado ? "Firma registrada" : "Este enlace ya no admite firma"}>
        <Alerta tono={firmado ? "success" : "info"} titulo={firmado ? "Listo" : "Sin acción pendiente"}>
          {firmado
            ? "Tu firma quedó registrada. Si corresponde, recibirás el documento firmado por correo."
            : "La solicitud ya no está vigente (firmada, rechazada, vencida o cancelada)."}
        </Alerta>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo={`Firmar · ${ETIQUETA_CLASE[datos.clase] ?? datos.clase}`}
      subtitulo={`Nivel ${datos.nivel} · huella del documento verificable al completarse (R6)`}
      acciones={
        rechazando ? undefined : (
          <>
            <Button
              disabled={enviando || !acepta || nombre.trim().length < 2}
              onClick={async () => {
                setEnviando(true);
                setError(
                  await firmarPorEnlace(slug, token, {
                    metodo: "nombre",
                    nombreFirma: nombre.trim(),
                    textoAceptacion: TEXTO_ACEPTACION,
                    versionAceptacion: VERSION_ACEPTACION,
                  }),
                );
                setEnviando(false);
                setListo("firmado");
              }}
            >
              {enviando ? "Firmando…" : "Firmar"}
            </Button>
            <Button variant="secondary" disabled={enviando} onClick={() => setRechazando(true)}>
              Rechazar
            </Button>
          </>
        )
      }
    >
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {datos.mensaje ? <p className="text-base text-fg-muted">{datos.mensaje}</p> : null}
      {rechazando ? (
        <div className="flex flex-col gap-3">
          <Campo etiqueta="Motivo del rechazo" htmlFor="firma-motivo">
            <Input id="firma-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Campo>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setRechazando(false)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={enviando || motivo.trim().length < 3}
              onClick={async () => {
                setEnviando(true);
                setError(await rechazarPorEnlace(slug, token, motivo.trim()));
                setEnviando(false);
                setListo("rechazado");
              }}
            >
              {enviando ? "Rechazando…" : "Confirmar rechazo"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="t-caption">
            Revisa el documento antes de firmar. La huella del documento congelado se compara con
            la que recibiste; cambiarlo cancela esta solicitud (R4). Ver el documento completo en
            línea llega con el diseño de esta pantalla (a confirmar).
          </p>
          <Campo etiqueta="Tu nombre" htmlFor="firma-nombre">
            <Input id="firma-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Checkbox etiqueta={TEXTO_ACEPTACION} marcado={acepta} onCambiar={setAcepta} />
        </>
      )}
    </AuthCard>
  );
}
