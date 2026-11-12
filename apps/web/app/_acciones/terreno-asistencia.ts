"use server";

import { type CodigoError, executeCapability, type Resultado } from "@opai/capabilities";

import { dispositivoActual } from "@/lib/dispositivo";
import { contextoSistema } from "@/lib/medidor";
import { permitir } from "@/lib/rate-limit";

/**
 * Asistencia en el equipo del kiosco (CAR-89 · Face ID, D-01). El equipo no tiene sesión: su cookie de dispositivo
 * es la credencial y se resuelve AQUÍ, en el servidor; el cliente nunca elige el dispositivo ni la instalación. Solo
 * pasan las capacidades de marcación y de rostro; cada una vuelve a verificar equipo activo, persona de la
 * instalación y PIN. Tope por equipo con fallo cerrado.
 */
const PERMITIDAS = new Set([
  "asistencia.marcas.registrar",
  "asistencia.rostro.estado",
  "asistencia.rostro.textos",
  "asistencia.rostro.iniciar_vida",
  "asistencia.rostro.consentir",
  "asistencia.rostro.revocar",
  "asistencia.rostro.enrolar",
]);

export async function ejecutarAsistenciaEquipo(
  id: string,
  entrada: Record<string, unknown>,
  dryRun = false,
): Promise<Resultado> {
  const falla = (code: CodigoError, message: string): Resultado => ({ ok: false, error: { code, message } });
  if (!PERMITIDAS.has(id)) return falla("FORBIDDEN", "Esta acción no está disponible en el equipo.");
  const equipo = await dispositivoActual();
  if (!equipo) return falla("UNAUTHENTICATED", "Este equipo no está emparejado.");
  if (equipo.estado !== "activo") return falla("UNPROCESSABLE", "Este dispositivo ya no está emparejado.");
  if (!(await permitir(`asistencia-equipo:${equipo.dispositivoId}`, 60, 60_000, { fallarCerrado: true })))
    return falla("UNPROCESSABLE", "Demasiados intentos. Espera un momento.");
  const propio = id === "asistencia.marcas.registrar" ? { instalacionId: equipo.instalacionId, canal: "kiosco" } : {};
  const r = await executeCapability(
    contextoSistema(equipo.tenantId, ["asistencia"]),
    id,
    { ...entrada, ...propio, dispositivoId: equipo.dispositivoId },
    { dryRun },
  );
  // Sin detalles internos hacia el equipo: solo código y mensaje de negocio.
  return r.ok ? r : falla(r.error.code, r.error.message);
}
