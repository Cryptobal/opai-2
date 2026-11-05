import type { Contexto } from "@opai/capabilities";

import { codigoVisible, type EstadoRendicion } from "../domain";

type Fila = {
  id: string;
  codigo: number;
  tipo: string;
  estado: string;
  solicitanteId: string;
  aprobadorId: string | null;
  centroCosto: string;
  instalacionId: string | null;
  descripcion: string;
  montoTotal: number;
  enviadaEn: Date | null;
  decididaEn: Date | null;
  motivoDecision: string | null;
  createdAt: Date;
};
type ItemFila = {
  id: string;
  fecha: Date;
  proveedor: string;
  folio: string | null;
  tipoDocumento: string;
  descripcion: string;
  monto: number;
  documentoId: string | null;
  sinRespaldoMotivo: string | null;
};

/** Nombres de las personas (aprobadores) por id; quien ya no existe queda sin nombre. */
export async function nombresDe(
  ctx: Contexto,
  ids: readonly (string | null)[],
): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter((x): x is string => !!x))];
  if (unicos.length === 0) return new Map();
  const u = await ctx.db.user.findMany({
    // Solo personas con membresía en esta empresa: nunca el nombre de un usuario de otra.
    where: { id: { in: unicos }, memberships: { some: { tenantId: ctx.tenantId } } },
    select: { id: true, name: true },
  });
  return new Map(u.map((x) => [x.id, x.name]));
}

export function resumenDe(r: Fila, nombres: ReadonlyMap<string, string> = new Map()) {
  return {
    id: r.id,
    codigo: r.codigo,
    codigoVisible: codigoVisible(r.codigo),
    tipo: r.tipo,
    estado: r.estado as EstadoRendicion,
    solicitanteId: r.solicitanteId,
    aprobadorId: r.aprobadorId,
    centroCosto: r.centroCosto,
    instalacionId: r.instalacionId,
    aprobadorNombre: (r.aprobadorId && nombres.get(r.aprobadorId)) || null,
    creadaEn: r.createdAt.toISOString(),
    descripcion: r.descripcion,
    montoTotal: r.montoTotal,
    enviadaEn: r.enviadaEn?.toISOString() ?? null,
    decididaEn: r.decididaEn?.toISOString() ?? null,
    motivoDecision: r.motivoDecision,
  };
}

type Num = { toNumber(): number };
type ViajeFila = {
  origenTexto: string;
  origenLat: Num;
  origenLng: Num;
  destinoTexto: string;
  destinoLat: Num;
  destinoLng: Num;
  km: Num;
  idaYVuelta: boolean;
  peajeClp: number;
  metodo: string;
  origenDistancia: string;
  montoCalculado: number;
  configSnapshot: unknown;
};

/** Tramo elegido, tal como quedó en la instantánea de parámetros del viaje. */
function tramoDe(snapshot: unknown): string | null {
  const t = (snapshot as { tramo?: unknown } | null)?.tramo;
  return typeof t === "string" ? t : null;
}

export function vistaDe(
  r: Fila & { items: ItemFila[]; viaje: ViajeFila | null },
  nombres?: ReadonlyMap<string, string>,
) {
  const v = r.viaje;
  return {
    ...resumenDe(r, nombres),
    items: r.items.map((i) => ({
      ...i,
      tipoDocumento: i.tipoDocumento === "factura" ? ("factura" as const) : ("boleta" as const),
      fecha: i.fecha.toISOString().slice(0, 10),
    })),
    viaje: v && {
      origen: v.origenTexto,
      origenLat: v.origenLat.toNumber(),
      origenLng: v.origenLng.toNumber(),
      destino: v.destinoTexto,
      destinoLat: v.destinoLat.toNumber(),
      destinoLng: v.destinoLng.toNumber(),
      fecha: (r.items[0]?.fecha ?? new Date(0)).toISOString().slice(0, 10),
      tramo: tramoDe(v.configSnapshot),
      km: v.km.toNumber(),
      idaYVuelta: v.idaYVuelta,
      peajeClp: v.peajeClp,
      metodo: v.metodo,
      origenDistancia:
        v.origenDistancia === "google" ? ("google" as const) : ("linea_recta" as const),
      montoCalculado: v.montoCalculado,
    },
  };
}
