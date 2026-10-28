import { agregarAAuditoriaGlobal, type HechoGlobal } from "./auditoria-global";
import { clienteApp } from "./client";
import { notificarConsulta } from "./metricas";
import type { Prisma } from "./generated/prisma/client";
import type { TenantTx } from "./transaccion";

// Cola de aprobaciones y auditoría de plataforma (CAR-36): tablas sin tenant_id ni RLS. Solo se
// llega a estas operaciones por `accesoPlataforma()`, que el contexto entrega a quien tiene
// `platformRole` (y, si es un agente, solo con una key de scope `platform`). Las que reciben `tx`
// se suman a la transacción del llamador (la escritura y su auditoría, atómicas: ADR-052).

type Db = TenantTx;
const db = (tx?: Db): Db => tx ?? clienteApp();

export type AprobacionPlataformaNueva = {
  origenTenantId: string | null;
  apiKeyId: string | null;
  agente: string;
  viaUserId: string;
  capability: string;
  input: Prisma.InputJsonValue;
  idempotencyKey: string | null;
  resumen: string;
  venceEn: Date;
};

export type HechoPlataforma = HechoGlobal;

/** Append a la cadena `plataforma` de la auditoría global. */
const auditarPlataforma = (hecho: HechoPlataforma, tx?: Db) =>
  agregarAAuditoriaGlobal("plataforma", hecho, tx);

/** Las pendientes con el plazo cumplido pasan a vencidas antes de leer (sin trabajo diario aparte). */
const vencer = (tx?: Db) =>
  db(tx).aprobacionPlataforma.updateMany({
    where: { estado: "pendiente", venceEn: { lte: new Date() } },
    data: { estado: "vencida" },
  });

export function operacionesAprobacionesPlataforma() {
  return {
    auditarPlataforma,
    crearAprobacionPlataforma: (data: AprobacionPlataformaNueva, tx?: Db) =>
      db(tx).aprobacionPlataforma.create({ data: { ...data, estado: "pendiente" } }),
    aprobacionPlataformaRepetida: (where: {
      apiKeyId: string | null;
      capability: string;
      idempotencyKey: string;
    }) => db().aprobacionPlataforma.findFirst({ where }),
    aprobacionPlataformaPorId: async (id: string) => {
      await vencer();
      return db().aprobacionPlataforma.findUnique({ where: { id } });
    },
    listarAprobacionesPlataforma: async (filtro: { estado?: string; limite: number }) => {
      await vencer();
      return db().aprobacionPlataforma.findMany({
        where: filtro.estado ? { estado: filtro.estado } : {},
        orderBy: { createdAt: "desc" },
        take: filtro.limite,
      });
    },
    /** Pasa de pendiente al estado final; 0 si otra persona la resolvió antes (o venció). */
    resolverAprobacionPlataforma: async (
      id: string,
      data: { estado: "aprobada" | "rechazada"; resueltaPor: string | null; motivo?: string },
      tx?: Db,
    ) => {
      const r = await db(tx).aprobacionPlataforma.updateMany({
        where: { id, estado: "pendiente", venceEn: { gt: new Date() } },
        data: { ...data, resueltaEn: new Date() },
      });
      return r.count;
    },
    guardarResultadoAprobacionPlataforma: (id: string, resultado: Prisma.InputJsonValue, tx?: Db) =>
      db(tx).aprobacionPlataforma.update({
        where: { id },
        data: { resultado },
        select: { id: true },
      }),
    /** Nombres de los responsables de las keys (identidad mínima, sin credenciales). */
    nombresDeUsuarios: (ids: string[]) =>
      db().user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    listarAuditoriaPlataforma: (filtro: {
      capability?: string;
      tenantObjetivoId?: string;
      antesDeSeq?: number;
      limite: number;
    }) =>
      db().auditoriaGlobal.findMany({
        where: {
          ambito: "plataforma",
          ...(filtro.capability ? { capability: { startsWith: filtro.capability } } : {}),
          ...(filtro.tenantObjetivoId ? { tenantObjetivoId: filtro.tenantObjetivoId } : {}),
          ...(filtro.antesDeSeq ? { seq: { lt: filtro.antesDeSeq } } : {}),
        },
        orderBy: { seq: "desc" },
        take: filtro.limite,
      }),
    /**
     * Lock de fila de todos los owners de plataforma (`SELECT … FOR UPDATE`, en orden de id para no
     * cruzarse) dentro de la transacción del cambio de rol, y el rol vigente de quien lo pide, leído
     * DESPUÉS del lock: dos bajas cruzadas se serializan y la segunda ve la primera confirmada.
     */
    bloquearOwnersDePlataforma: async (tx: Db, responsableId: string) => {
      notificarConsulta();
      await tx.$queryRaw`
        SELECT id FROM core.users WHERE platform_role = 'owner' ORDER BY id FOR UPDATE`;
      const yo = await tx.user.findUnique({
        where: { id: responsableId },
        select: { platformRole: true },
      });
      return yo?.platformRole ?? null;
    },
  };
}
