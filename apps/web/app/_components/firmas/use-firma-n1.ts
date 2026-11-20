"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TEXTO_ACEPTACION, VERSION_ACEPTACION, type PayloadFirmaN1 } from "./firmar-constantes";
import type { DatosFirma } from "./tipos";

type Acciones = {
  urlDocumento: () => Promise<{ url: string } | null>;
  firmar: (input: PayloadFirmaN1) => Promise<string | null>;
  rechazar: (motivo: string) => Promise<string | null>;
};

/** Estado y acciones compartidos del flujo N1 (portal y enlace del correo). */
export function useFirmaN1(datos: DatosFirma, acciones: Acciones, volverHref?: string) {
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
    const r = await acciones.urlDocumento();
    setVerificandoDocumento(false);
    if (!r) {
      setError("No se pudo abrir el documento. Inténtalo de nuevo.");
      return;
    }
    window.open(r.url, "_blank", "noopener,noreferrer");
  }

  async function confirmarFirma() {
    setEnviando(true);
    const err = await acciones.firmar({
      metodo: "nombre",
      nombreFirma: nombre.trim(),
      textoAceptacion: TEXTO_ACEPTACION,
      versionAceptacion: VERSION_ACEPTACION,
    });
    setEnviando(false);
    if (err) setError(err);
    else setListo("firmado");
  }

  async function confirmarRechazo() {
    setEnviando(true);
    const err = await acciones.rechazar(motivo.trim());
    setEnviando(false);
    if (err) setError(err);
    else setListo("rechazado");
  }

  const firmado = listo === "firmado" || datos.estadoFirmante === "firmado";
  const sinAccion =
    listo !== null ||
    datos.estadoFirmante !== "pendiente" ||
    (datos.estadoSolicitud !== "enviada" && datos.estadoSolicitud !== "en_curso");

  return {
    nombre,
    setNombre,
    acepta,
    setAcepta,
    motivo,
    setMotivo,
    rechazando,
    setRechazando,
    error,
    enviando,
    listo,
    firmado,
    sinAccion,
    verificandoDocumento,
    verDocumento,
    confirmarFirma,
    confirmarRechazo,
    volver: volverHref ? () => router.push(volverHref) : undefined,
  };
}