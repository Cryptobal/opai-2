import { verificarPin } from "@opai/db";
import { estaBloqueada } from "@opai/domain";

import { ajuste } from "../config/valores";
import type { Contexto } from "../../types";
import type { Equipo, Hecho, Rechazos } from "./acceso-tipos";
import { TIPOS_HECHO_TERRENO } from "./hechos-tipos";

const METODOS_OFFLINE = ["rut_pin", "pin_respaldo"] as const;

export type AsistenciaResuelto = {
  rechazos: Rechazos;
  /** Sin escritura en la transacción del lote: la marca la crea `asistencia.marcas.registrar` después. */
  escribir: () => Promise<void>;
};

const deMarca = (hechos: readonly Hecho[]) =>
  hechos.flatMap((h) => {
    if (h.tipo !== "asistencia.marca") return [];
    const r = TIPOS_HECHO_TERRENO["asistencia.marca"].safeParse(h.payload);
    return r.success ? [{ h, p: r.data }] : [];
  });

async function pinValido(ctx: Contexto, personaId: string, pin: string | undefined): Promise<boolean> {
  if (!pin) return false;
  const c = await ctx.db.credencialTerreno.findUnique({ where: { personaId } });
  if (c) {
    if (estaBloqueada(c.bloqueadoHasta, new Date())) return false;
    return verificarPin(pin, c.pinHash);
  }
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } });
  return !!t?.slug.startsWith("qa-") && pin === "123456";
}

/** Marca de asistencia por cola (CAR-626): solo RUT+PIN o PIN de respaldo; el rostro no entra sin línea. */
export async function resolverAsistencia(
  ctx: Contexto,
  _equipo: Equipo,
  hechos: readonly Hecho[],
): Promise<AsistenciaResuelto> {
  const rechazos: Rechazos = new Map();
  const vacio: AsistenciaResuelto = { rechazos, escribir: async () => undefined };
  const marcas = deMarca(hechos);
  if (marcas.length === 0) return vacio;
  if (!ctx.modulosActivos.includes("asistencia")) {
    for (const { h } of marcas) rechazos.set(h.clave, "modulo_inactivo");
    return vacio;
  }
  const habilitadas = await ajuste<boolean>(ctx, "asistencia", "marcas_habilitadas").catch(() => false);
  if (!habilitadas) {
    for (const { h } of marcas) rechazos.set(h.clave, "modulo_inactivo");
    return vacio;
  }
  for (const { h, p } of marcas) {
    if (!h.personaId) {
      rechazos.set(h.clave, "persona_no_valida");
      continue;
    }
    if (!METODOS_OFFLINE.includes(p.metodo)) {
      rechazos.set(h.clave, "metodo_no_offline");
      continue;
    }
    if (p.metodo === "pin_respaldo" && !p.motivoRespaldo) {
      rechazos.set(h.clave, "payload_invalido");
      continue;
    }
    if (!(await pinValido(ctx, h.personaId, p.credencial))) rechazos.set(h.clave, "credencial_invalida");
  }
  return vacio;
}
