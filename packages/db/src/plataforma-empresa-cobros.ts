import { operacionesPruebasGratis } from "./plataforma-empresa-pruebas-gratis";
import type { TenantTx } from "./transaccion";

// Cobro por módulo (CAR-188, ADR-071): operaciones con nombre de Plataforma sobre las condiciones y
// los cargos de UNA empresa. `db` es `forTenant(tenantId)` (la RLS aplica) y además cada consulta
// filtra por `tenantId`, para que el mismo código no pueda tocar otra empresa ni en los tests.

const condicion = {
  id: true,
  moduloId: true,
  moneda: true,
  forma: true,
  unidad: true,
  precioMensual: true,
  minimoMensual: true,
  pasaACobro: true,
  cobroDesde: true,
  pruebaHasta: true,
  descuentoPct: true,
  nota: true,
  updatedAt: true,
} as const;

const cargo = {
  id: true,
  moduloId: true,
  periodo: true,
  moneda: true,
  forma: true,
  unidad: true,
  precioMensual: true,
  minimoMensual: true,
  cantidad: true,
  descuentoPct: true,
  diasCobrados: true,
  diasMes: true,
  monto: true,
  ufCentavos: true,
  montoClp: true,
  estado: true,
  motivoAnulacion: true,
  anuladoEn: true,
  createdAt: true,
} as const;

export type DatosCondicionCobro = {
  moneda: string;
  forma: string;
  unidad: string | null;
  precioMensual: number;
  minimoMensual: number | null;
  pasaACobro: boolean;
  cobroDesde: Date | null;
  pruebaHasta: Date | null;
  descuentoPct: number;
  nota: string | null;
};

export type NuevoCargoCobro = {
  moduloId: string;
  periodo: Date;
  moneda: string;
  forma: string;
  unidad: string | null;
  precioMensual: number;
  minimoMensual: number | null;
  cantidad: number | null;
  descuentoPct: number;
  diasCobrados: number;
  diasMes: number;
  monto: number;
  ufCentavos: number | null;
  montoClp: number;
};

export type FiltroCargos = { periodo?: Date; estado?: string };

export function operacionesCobros(db: TenantTx, tenantId: string) {
  return {
    /** Estado de la empresa (trial | activo | suspendido): el plan base no se cobra si está suspendida. */
    estadoEmpresa: async () =>
      (await db.tenant.findFirst({ where: { id: tenantId }, select: { estado: true } }))?.estado ??
      null,
    /**
     * Lo que se cuenta para el cobro por unidad, sin datos personales: el acceso de cada membresía
     * activa (rol, permisos de su rol personalizado y excepciones), los trabajadores con vínculo
     * laboral vigente y las instalaciones activas.
     */
    unidadesCobro: async () => ({
      miembros: await db.membership.findMany({
        where: { tenantId, estado: "activa" },
        select: {
          rol: true,
          roleId: true,
          rolTenant: { select: { permisos: true } },
          excepciones: { select: { permiso: true, conceder: true } },
        },
      }),
      trabajadores: (
        await db.vinculoLaboral.findMany({
          where: { tenantId, estado: "vigente" },
          distinct: ["personaId"],
          select: { personaId: true },
        })
      ).length,
      instalaciones: await db.instalacion.count({ where: { tenantId, estado: "activa" } }),
    }),
    condicionesCobro: () =>
      db.cobroCondicion.findMany({
        where: { tenantId },
        orderBy: { moduloId: "asc" },
        select: condicion,
      }),
    condicionCobro: (moduloId: string) =>
      db.cobroCondicion.findFirst({ where: { tenantId, moduloId }, select: condicion }),
    fijarCondicionCobro: (moduloId: string, datos: DatosCondicionCobro) =>
      db.cobroCondicion.upsert({
        where: { tenantId_moduloId: { tenantId, moduloId } },
        update: datos,
        create: { tenantId, moduloId, ...datos },
        select: condicion,
      }),
    /** Quita la condición (el módulo deja de cobrarse). 0 si no había. */
    quitarCondicionCobro: async (moduloId: string) =>
      (await db.cobroCondicion.deleteMany({ where: { tenantId, moduloId } })).count,
    cargosCobro: (f: FiltroCargos, limite: number) =>
      db.cobroCargo.findMany({
        where: {
          tenantId,
          ...(f.periodo ? { periodo: f.periodo } : {}),
          ...(f.estado ? { estado: f.estado } : {}),
        },
        orderBy: [{ periodo: "desc" }, { moduloId: "asc" }],
        take: limite,
        select: cargo,
      }),
    cargoCobro: (id: string) => db.cobroCargo.findFirst({ where: { tenantId, id }, select: cargo }),
    /**
     * Inserta los cargos sin duplicar: el índice único parcial (empresa, módulo, período) de los
     * cargos «listo» descarta el que ya existe (ON CONFLICT DO NOTHING). Devuelve cuántos entraron.
     */
    crearCargosCobro: async (cargos: readonly NuevoCargoCobro[]) =>
      cargos.length
        ? (
            await db.cobroCargo.createMany({
              data: cargos.map((c) => ({ ...c, tenantId, estado: "listo" })),
              skipDuplicates: true,
            })
          ).count
        : 0,
    /** Anula solo si sigue «listo» (otra persona pudo anularlo): 0 si no. */
    anularCargoCobro: async (id: string, motivo: string) =>
      (
        await db.cobroCargo.updateMany({
          where: { tenantId, id, estado: "listo" },
          data: { estado: "anulado", motivoAnulacion: motivo, anuladoEn: new Date() },
        })
      ).count,
    ...operacionesPruebasGratis(db, tenantId),
  };
}
