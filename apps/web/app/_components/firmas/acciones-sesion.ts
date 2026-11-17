"use server";

import { ejecutarComoUsuario } from "@/lib/servidor";

export type DatosFirma = {
  nombre: string;
  rol: string;
  estadoFirmante: string;
  estadoSolicitud: string;
  clase: string;
  nivel: string;
  mensaje: string | null;
  plazoVence: string;
  documentoVersion: number;
};

export async function verFirmaSesion(portal: string, solicitudId: string) {
  return ejecutarComoUsuario<DatosFirma>(portal, "core.firmas.ver_firmante", { solicitudId });
}

export async function firmarEnSesion(
  portal: string,
  solicitudId: string,
  input: {
    metodo: "trazo" | "nombre";
    nombreFirma: string;
    textoAceptacion: string;
    versionAceptacion: string;
  },
): Promise<string | null> {
  const r = await ejecutarComoUsuario(portal, "core.firmas.firmar", { solicitudId, aceptaMedio: true, ...input });
  return r.ok ? null : r.error.message;
}

export async function rechazarEnSesion(portal: string, solicitudId: string, motivo: string): Promise<string | null> {
  const r = await ejecutarComoUsuario(portal, "core.firmas.rechazar", { solicitudId, motivo });
  return r.ok ? null : r.error.message;
}

export async function urlDocumentoEnSesion(
  portal: string,
  solicitudId: string,
): Promise<{ url: string; nombre: string; mime: string } | null> {
  const r = await ejecutarComoUsuario<{ url: string; nombre: string; mime: string }>(
    portal,
    "core.firmas.documento_url",
    { solicitudId },
  );
  return r.ok ? r.data : null;
}