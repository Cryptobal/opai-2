"use server";

import { type CodigoError, executeCapability, type Resultado } from "@opai/capabilities";
import { normalizarRut } from "@opai/domain";

import type { MarcaListo } from "@/app/_components/asistencia/marcar-resultado";

import { contextoMarcacionPublica } from "./ver";

const falla = (code: CodigoError, message: string): Resultado => ({ ok: false, error: { code, message } });

export async function marcarPorEnlacePublico(
  codigo: string,
  entrada: {
    rut: string;
    pin: string;
    claveDispositivo: string;
    lat?: number | undefined;
    lng?: number | undefined;
    precisionM?: number | undefined;
  },
): Promise<Resultado> {
  const base = await contextoMarcacionPublica(codigo);
  if (base === "limitada") return falla("UNPROCESSABLE", "Demasiadas consultas. Espera un minuto e inténtalo de nuevo.");
  if (!base) return falla("NOT_FOUND", "El enlace no existe o ya no está disponible.");
  const rut = normalizarRut(entrada.rut);
  if (!rut) return falla("UNPROCESSABLE", "RUT inválido.");
  const cred = await base.ctx.db.credencialTerreno.findFirst({
    where: { tenantId: base.tenantId, rut },
    select: { personaId: true },
  });
  if (!cred) return falla("FORBIDDEN", "RUT o PIN incorrectos. Revisa tus datos o pide ayuda a RR. HH.");
  const persona = await base.ctx.db.persona.findFirst({
    where: { id: cred.personaId, archivadaEn: null, anonimizadaEn: null },
    select: { id: true },
  });
  if (!persona) return falla("FORBIDDEN", "RUT o PIN incorrectos. Revisa tus datos o pide ayuda a RR. HH.");
  return executeCapability(base.ctx, "asistencia.marcas.registrar", {
    personaId: persona.id,
    instalacionId: base.instalacionId,
    metodo: "rut_pin",
    credencial: entrada.pin,
    claveDispositivo: entrada.claveDispositivo,
    enlacePublicoValidado: true,
    ...(entrada.lat != null && entrada.lng != null
      ? { lat: entrada.lat, lng: entrada.lng, precisionM: entrada.precisionM ?? 0 }
      : {}),
  });
}