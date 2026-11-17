"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, Button, Campo, Checkbox, Input } from "@opai/ds";

import { ETIQUETA_CLASE } from "./etiquetas";
import {
  type DatosFirma,
  firmarEnSesion,
  rechazarEnSesion,
  urlDocumentoEnSesion,
} from "./acciones-sesion";

const TEXTO_ACEPTACION =
  "Acepto firmar este documento electrónicamente y declaro que la información que entrego es mía.";
const VERSION_ACEPTACION = "2026-10";

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
  const router = useRouter();
  const [nombre, setNombre] = useState(datos.nombre);
  const [acepta, setAcepta] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<"firmado" | "rechazado" | null>(null);
  const [verificandoDocumento, setVerificandoDocumento] = useState(false);

  async function verDocumento() {
    setVerificandoDocumento(true);
    const r = await urlDocumentoEnSesion(portal, solicitudId);
    setVerificandoDocumento(false);
    if (!r) {
      setError("No se pudo abrir el documento. Inténtalo de nuevo.");
      return;
    }
    window.open(r.url, "_blank", "noopener,noreferrer");
  }

  if (datos.rol !== "firma") {
    return (
      <Alerta tono="info" titulo="Este documento es solo de copia">
        No tienes firma pendiente en esta solicitud.
      </Alerta>
    );
  }
  if (listo || datos.estadoFirmante !== "pendiente" || (datos.estadoSolicitud !== "enviada" && datos.estadoSolicitud !== "en_curso")) {
    const firmado = listo === "firmado" || datos.estadoFirmante === "firmado";
    return (
      <div className="flex flex-col gap-4">
        <Alerta tono={firmado ? "success" : "info"} titulo={firmado ? "Listo" : "Sin acción pendiente"}>
          {firmado
            ? "Tu firma quedó registrada. Si corresponde, recibirás el documento firmado por correo."
            : "La solicitud ya no está vigente (firmada, rechazada, vencida o cancelada)."}
        </Alerta>
        <Button variant="secondary" onClick={() => router.push(volverHref)}>
          Volver a la lista
        </Button>
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {datos.mensaje ? <p className="text-base text-fg-muted">{datos.mensaje}</p> : null}
      <p className="t-caption">
        {ETIQUETA_CLASE[datos.clase] ?? datos.clase} · Nivel {datos.nivel} · vence{" "}
        {new Date(datos.plazoVence).toLocaleDateString("es-CL")}
      </p>
      <Button variant="secondary" disabled={verificandoDocumento} onClick={() => void verDocumento()}>
        {verificandoDocumento ? "Abriendo…" : "Ver documento"}
      </Button>
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
                const err = await rechazarEnSesion(portal, solicitudId, motivo.trim());
                setEnviando(false);
                if (err) setError(err);
                else setListo("rechazado");
              }}
            >
              Confirmar rechazo
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Campo etiqueta="Nombre con el que firmas" htmlFor="firma-nombre">
            <Input id="firma-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
          </Campo>
          <p className="t-caption">
            Revisa el documento completo antes de firmar. La huella del documento congelado se compara con la que
            recibiste; cambiarlo cancela esta solicitud (R4).
          </p>
          <Checkbox etiqueta={TEXTO_ACEPTACION} marcado={acepta} onCambiar={setAcepta} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={enviando || !acepta || nombre.trim().length < 2}
              onClick={async () => {
                setEnviando(true);
                const err = await firmarEnSesion(portal, solicitudId, {
                  metodo: "nombre",
                  nombreFirma: nombre.trim(),
                  textoAceptacion: TEXTO_ACEPTACION,
                  versionAceptacion: VERSION_ACEPTACION,
                });
                setEnviando(false);
                if (err) setError(err);
                else setListo("firmado");
              }}
            >
              {enviando ? "Firmando…" : "Firmar"}
            </Button>
            <Button variant="secondary" disabled={enviando} onClick={() => setRechazando(true)}>
              Rechazar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}