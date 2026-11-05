import { operacionesCobros } from "./plataforma-empresa-cobros";
import { operacionesPerfilTributario } from "./plataforma-perfil-tributario";
import type { TenantTx } from "./transaccion";

// Lo que Plataforma puede leer y cambiar DENTRO de una empresa (CAR-40): operaciones con nombre y
// `select` acotado sobre `forTenant(tenantId)` (la RLS de esa empresa sigue aplicando), en lugar
// del delegado libre `paraTenant`. Nunca devuelven el payload de trabajos y eventos, el hash de
// las API keys ni la configuración o los secretos de las integraciones.

const trabajo = {
  id: true,
  tipo: true,
  estado: true,
  intentos: true,
  maxIntentos: true,
  programadoPara: true,
  updatedAt: true,
  ultimoError: true,
} as const;

const cabeza = { ultimoSeq: true, verificadaEn: true, verificacionOk: true } as const;

const PROBLEMAS = {
  OR: [{ estado: "fallido" }, { estado: { in: ["pendiente", "en_curso"] }, intentos: { gt: 0 } }],
};

export type FiltroTrabajos = { estado?: string; conProblemas?: boolean };

/** Operaciones con nombre de Plataforma sobre una empresa. `db` es `forTenant(tenantId)`. */
export function operacionesEmpresa(db: TenantTx, tenantId: string) {
  const ejecuciones = (desde: Date) => ({
    recurso: "capacidad.ejecucion",
    createdAt: { gte: desde },
  });
  return {
    ...operacionesCobros(db, tenantId),
    ...operacionesPerfilTributario(db, tenantId),
    cabezaAuditoria: () => db.auditoriaCabeza.findUnique({ where: { tenantId }, select: cabeza }),
    cabezaBitacora: () => db.bitacoraCabeza.findUnique({ where: { tenantId }, select: cabeza }),
    trabajo: (id: string) => db.trabajo.findUnique({ where: { id }, select: trabajo }),
    trabajos: (f: FiltroTrabajos, limite: number) =>
      db.trabajo.findMany({
        where: f.conProblemas ? PROBLEMAS : f.estado ? { estado: f.estado } : {},
        orderBy: { updatedAt: "desc" },
        take: limite,
        select: trabajo,
      }),
    contarTrabajos: (f: FiltroTrabajos) =>
      db.trabajo.count({ where: f.conProblemas ? PROBLEMAS : { estado: f.estado ?? "" } }),
    /** Reintento: vuelve a pendiente con los intentos en cero. */
    reintentarTrabajo: (id: string) =>
      db.trabajo.update({
        where: { id },
        data: { estado: "pendiente", intentos: 0, programadoPara: new Date(), ultimoError: null },
        select: trabajo,
      }),
    /** Cancela solo si sigue pendiente (un runner pudo reclamarlo): 0 si no. */
    cancelarTrabajo: async (id: string) =>
      (
        await db.trabajo.updateMany({
          where: { id, estado: "pendiente" },
          data: { estado: "cancelado" },
        })
      ).count,
    eventos: (estado: string | undefined, limite: number) =>
      db.evento.findMany({
        where: estado ? { estado } : {},
        orderBy: { createdAt: "desc" },
        take: limite,
        select: {
          id: true,
          tipo: true,
          estado: true,
          intentos: true,
          error: true,
          createdAt: true,
        },
      }),
    consumosPorRecurso: (desde: Date) =>
      db.consumo.groupBy({
        by: ["recurso"],
        where: { createdAt: { gte: desde } },
        _sum: { cantidad: true, costoTotalMicro: true },
      }),
    consumosPorKey: (desde: Date) =>
      db.consumo.groupBy({
        by: ["apiKeyId"],
        where: { createdAt: { gte: desde }, apiKeyId: { not: null } },
        _sum: { costoTotalMicro: true },
      }),
    ultimaEjecucion: () =>
      db.consumo.findFirst({
        where: { recurso: "capacidad.ejecucion" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    contarEjecuciones: (desde: Date, soloErrores = false) =>
      db.consumo.count({ where: { ...ejecuciones(desde), ...(soloErrores ? { ok: false } : {}) } }),
    ejecucionesPorModulo: (desde: Date) =>
      db.consumo.groupBy({ by: ["modulo"], where: ejecuciones(desde), _count: { _all: true } }),
    ejecucionesPorPortal: (desde: Date) =>
      db.consumo.groupBy({ by: ["portal"], where: ejecuciones(desde), _count: { _all: true } }),
    /** Keys sin hash ni permisos: identidad, scopes, uso y presupuesto. */
    apiKeys: () =>
      db.apiKey.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          nombre: true,
          prefijo: true,
          scopes: true,
          ultimoUsoEn: true,
          revocadaEn: true,
          presupuestoMensualMicro: true,
        },
      }),
    /** Estado de las integraciones, sin su configuración ni secretos. */
    integraciones: () =>
      db.integracion.findMany({
        orderBy: { proveedor: "asc" },
        select: {
          proveedor: true,
          modalidad: true,
          estado: true,
          ultimoTestEn: true,
          ultimoError: true,
        },
      }),
    modulos: () =>
      db.tenantModule.findMany({ where: { tenantId }, select: { moduloId: true, estado: true } }),
    fijarModulo: (moduloId: string, estado: string) =>
      db.tenantModule.upsert({
        where: { tenantId_moduloId: { tenantId, moduloId } },
        update: { estado },
        create: { tenantId, moduloId, estado },
        select: { moduloId: true, estado: true },
      }),
    contarMiembrosActivos: () => db.membership.count({ where: { estado: "activa" } }),
    administradores: () =>
      db.membership.findMany({
        where: { rol: { in: ["owner", "admin"] } },
        select: {
          id: true,
          rol: true,
          estado: true,
          user: { select: { name: true, email: true } },
        },
      }),
    invitaciones: () =>
      db.invitation.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          email: true,
          rol: true,
          acceptedAt: true,
          revocadaEn: true,
          expiresAt: true,
        },
      }),
  };
}

export type OperacionesEmpresa = ReturnType<typeof operacionesEmpresa>;
