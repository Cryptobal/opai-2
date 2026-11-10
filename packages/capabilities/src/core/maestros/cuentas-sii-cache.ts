// Caché por (empresa, RUT) de la consulta de contribuyente al SII (CAR-156). Lo que no es una acción
// explícita de la persona (alta por API, importador) se encola; lo explícito (abrir «Datos del SII»,
// aplicar) reutiliza la caché vigente y solo sale al proveedor si no la hay. Los datos son contenido
// externo del SII: se validan al leerlos y nunca se aplican solos a una cuenta.
import { z } from "zod";

import {
  cacheSiiVigente,
  esEstadoCacheSii,
  puedeRefrescarSii,
  venceCacheSii,
  type EstadoCacheSii,
} from "@opai/domain";
import type { DatosContribuyente, ResultadoContribuyente } from "@opai/integrations";
import { Prisma } from "@opai/db";

import type { Contexto } from "../../types";
import { consultarProveedor } from "./cuentas-sii-fuente";

const datosSchema = z.object({
  rut: z.string(),
  razonSocial: z.string(),
  actividades: z.array(
    z.object({ codigo: z.string(), descripcion: z.string(), afectaIva: z.boolean() }),
  ),
  direccion: z.string().nullable(),
  comuna: z.string().nullable(),
  ciudad: z.string().nullable(),
  correoIntercambio: z.string().nullable(),
  inicioActividades: z.string().nullable(),
});

export type OrigenSii = "cache" | "sii";
export type ConsultaSii = ResultadoContribuyente & {
  origen: OrigenSii | null;
  consultadoEn: Date | null;
};

type FilaCache = { rut: string; estado: string; datos: unknown; consultadoEn: Date; venceEn: Date };

const MENSAJE_SIN_REGISTROS = (rut: string) => `No hay registros del RUT ${rut} en el SII.`;

/** Fila guardada → resultado; una fila con datos que no calzan con el esquema se ignora (null). */
function desdeFila(f: FilaCache): ConsultaSii | null {
  if (!esEstadoCacheSii(f.estado)) return null;
  const base = { origen: "cache" as const, consultadoEn: f.consultadoEn };
  if (f.estado === "no_encontrado")
    return { ...base, estado: "no_encontrado", mensaje: MENSAJE_SIN_REGISTROS(f.rut) };
  const d = datosSchema.safeParse(f.datos);
  return d.success ? { ...base, estado: f.estado, datos: d.data } : null;
}

/** Caché del RUT (vigente o no) de la empresa actual. */
async function filaDe(ctx: Contexto, rut: string): Promise<FilaCache | null> {
  return ctx.db.siiContribuyente.findFirst({ where: { rut } });
}

/** Resultados vigentes en caché para varios RUT, en una consulta (importador, lista). */
export async function cacheSiiEnBloque(
  ctx: Contexto,
  ruts: readonly string[],
  ahora = new Date(),
): Promise<Map<string, ConsultaSii>> {
  if (!ruts.length) return new Map();
  const filas = await ctx.db.siiContribuyente.findMany({
    where: { rut: { in: [...new Set(ruts)] }, venceEn: { gt: ahora } },
  });
  const out = new Map<string, ConsultaSii>();
  for (const f of filas) {
    const r = desdeFila(f);
    if (r) out.set(f.rut, r);
  }
  return out;
}

/** Guarda una respuesta definitiva (las demás no se guardan: se vuelve a intentar). */
export async function guardarCacheSii(
  ctx: Contexto,
  rut: string,
  r: ResultadoContribuyente,
  ahora = new Date(),
): Promise<void> {
  if (!esEstadoCacheSii(r.estado)) return;
  const estado: EstadoCacheSii = r.estado;
  const datos = "datos" in r ? (r.datos satisfies DatosContribuyente) : undefined;
  const fila = {
    estado,
    datos: datos ? { ...datos, actividades: datos.actividades.map((a) => ({ ...a })) } : null,
    consultadoEn: ahora,
    venceEn: venceCacheSii(estado, ahora),
  };
  await ctx.db.siiContribuyente.upsert({
    where: { tenantId_rut: { tenantId: ctx.tenantId, rut } },
    // Una columna Json se deja en NULL con `Prisma.DbNull` (null a secas no compila).
    create: { tenantId: ctx.tenantId, rut, ...fila, datos: fila.datos ?? Prisma.DbNull },
    update: { ...fila, datos: fila.datos ?? Prisma.DbNull },
  });
}

/**
 * Consulta con caché: si hay una respuesta vigente, la devuelve sin salir al proveedor; si no (o si
 * se pide `refrescar` y la guardada tiene más de 10 minutos), consulta y guarda la respuesta. Si al
 * refrescar el SII no responde, se devuelve la guardada vigente (no se pierde un dato válido). Con
 * `guardar: false` (vista previa de una escritura) no escribe la caché.
 */
export async function consultarContribuyente(
  ctx: Contexto,
  rut: string,
  { refrescar = false, guardar = true }: { refrescar?: boolean; guardar?: boolean } = {},
): Promise<ConsultaSii> {
  const ahora = new Date();
  const fila = await filaDe(ctx, rut);
  const guardada = fila ? desdeFila(fila) : null;
  const vigente = guardada && fila && cacheSiiVigente(fila.venceEn, ahora) ? guardada : null;
  if (vigente && fila && (!refrescar || !puedeRefrescarSii(fila.consultadoEn, ahora))) return vigente;
  const r = await consultarProveedor(ctx, rut);
  const desdeSii = esEstadoCacheSii(r.estado);
  if (!desdeSii && vigente) return vigente;
  if (guardar) await guardarCacheSii(ctx, rut, r, ahora);
  return { ...r, origen: desdeSii ? "sii" : null, consultadoEn: desdeSii ? ahora : null };
}
