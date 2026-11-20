import { executeCapability } from "../../execute";
import type { Contexto } from "../../types";
import type { HechoEntrada } from "./hechos-evaluar";
import { TIPOS_HECHO_TERRENO } from "./hechos-tipos";

/** Tras persistir el hecho, crea la marca legal con la misma capacidad que en línea (CAR-626). */
export async function aplicarMarcasAsistenciaOffline(
  ctx: Contexto,
  equipo: { id: string; instalacionId: string },
  hechos: readonly HechoEntrada[],
): Promise<void> {
  for (const h of hechos) {
    const r = TIPOS_HECHO_TERRENO["asistencia.marca"].safeParse(h.payload);
    if (!r.success || !h.personaId) continue;
    const p = r.data;
    await executeCapability(ctx, "asistencia.marcas.registrar", {
      personaId: h.personaId,
      instalacionId: equipo.instalacionId,
      dispositivoId: equipo.id,
      canal: "kiosco",
      metodo: p.metodo,
      credencial: p.credencial,
      ...(p.motivoRespaldo ? { motivoRespaldo: p.motivoRespaldo } : {}),
      ...(p.tipo ? { tipo: p.tipo } : {}),
      claveDispositivo: h.clave,
      origen: "offline_queue",
      horaDispositivo: h.horaHecho,
      ...(p.lat !== undefined && p.lng !== undefined
        ? { lat: p.lat, lng: p.lng, precisionM: p.precisionM }
        : {}),
    });
  }
}

/** Quita el PIN del JSON persistido: el hecho queda auditable sin guardar el secreto. */
export function payloadHechoSinCredencial(h: HechoEntrada): object {
  if (h.tipo !== "asistencia.marca" || typeof h.payload !== "object" || !h.payload) return h.payload as object;
  const { credencial: _, ...rest } = h.payload as Record<string, unknown>;
  return rest;
}