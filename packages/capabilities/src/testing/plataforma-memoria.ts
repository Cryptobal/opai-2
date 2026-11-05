// Cola de aprobaciones y auditoría de plataforma en memoria (CAR-36): mismas operaciones con
// nombre que `operacionesAprobacionesPlataforma` de @opai/db, sobre la base falsa. La cadena de hash
// y los locks reales se prueban contra Postgres (`*-db.test.ts`).
import type { Globales, HechoPlataforma } from "@opai/db";

import type { Fila } from "./db-memoria-util";

type Delegado = {
  create(a: { data: Fila }): Promise<Fila>;
  findFirst(a: { where: Fila }): Promise<Fila | null>;
  findUnique(a: { where: Fila }): Promise<Fila | null>;
  findMany(a: Record<string, unknown>): Promise<Fila[]>;
  updateMany(a: { where: Fila; data: Fila }): Promise<{ count: number }>;
  update(a: { where: Fila; data: Fila }): Promise<Fila>;
  upsert(a: Upsert): Promise<Fila>;
};
type Upsert = { where: Fila; create: Fila; update: Fila };

/** Las operaciones con nombre de `accesoPlataforma()` sobre la base en memoria. */
export function globalesEnMemoria(delegado: (m: string) => Delegado): Globales {
  const globales: Record<string, unknown> = {
    ...plataformaEnMemoria(delegado),
    tenantPorId: (id: string) => delegado("tenant").findUnique({ where: { id } }),
    tenantPorSlug: (slug: string) => delegado("tenant").findUnique({ where: { slug } }),
    listarTenants: (id?: string) =>
      delegado("tenant").findMany({ where: id ? { id } : {}, orderBy: { nombre: "asc" } }),
    crearTenant: (data: Fila) => delegado("tenant").create({ data }),
    // Empresa + perfil tributario; el RUT repetido falla como la restricción única real (P2002).
    crearTenantConPerfil: async (data: Fila, datos: Fila) => {
      if (await delegado("perfilEmpresa").findFirst({ where: { rut: datos["rut"] } }))
        throw Object.assign(new Error("Unique constraint failed"), {
          code: "P2002",
          meta: { constraint: "perfil_empresa_rut_unico" },
        });
      const tenant = await delegado("tenant").create({ data });
      await delegado("perfilEmpresa").create({ data: { tenantId: tenant["id"], ...datos } });
      return tenant;
    },
    actualizarTenant: (id: string, data: Fila) =>
      delegado("tenant").update({ where: { id }, data }),
    usuariosDePlataforma: async () =>
      (await delegado("user").findMany({ orderBy: { email: "asc" } })).filter(
        (u) => u["platformRole"],
      ),
    listarAjustes: () => delegado("ajustePlataforma").findMany({}),
    ajustePorClave: (where: Fila) => delegado("ajustePlataforma").findUnique({ where }),
    guardarAjuste: (args: Upsert, _tx?: unknown) =>
      delegado("ajustePlataforma").upsert({ ...args, create: { version: 1, ...args.create } }),
    listarPrecios: (hasta: Date) =>
      delegado("precioRecurso").findMany({
        where: { vigenteDesde: { lte: hasta } },
        orderBy: [{ recurso: "asc" }, { vigenteDesde: "desc" }],
      }),
    precioPorVigencia: (where: Fila) => delegado("precioRecurso").findUnique({ where }),
    guardarPrecio: (args: Upsert, _tx?: unknown) => delegado("precioRecurso").upsert(args),
    // Indicadores legales (CAR-193): propuestas de la semilla; la resolución real se prueba en Postgres.
    propuestasIndicadores: () => delegado("propuestaIndicador").findMany({}),
    capturasPrevisionales: async () => [],
    resolverPropuestaIndicador: async () => "aprobado",
    // UF (CAR-188): filas `ufPublicada` { desde: Date, centavos } de la semilla; la última ≤ día.
    ufAlDia: async (dia: Date) => {
      const filas = await delegado("ufPublicada").findMany({ orderBy: { desde: "desc" } });
      const f = filas.find((x) => (x["desde"] as Date) <= dia);
      return f ? { centavos: f["centavos"] as number, desde: f["desde"] as Date } : null;
    },
  };
  return globales as Globales;
}

function plataformaEnMemoria(delegado: (m: string) => Delegado) {
  const cola = () => delegado("aprobacionPlataforma");
  const vencer = () =>
    cola().updateMany({
      where: { estado: "pendiente", venceEn: { lte: new Date() } },
      data: { estado: "vencida" },
    });
  return {
    auditarPlataforma: async (h: HechoPlataforma) => {
      const previas = await delegado("auditoriaGlobal").findMany({
        where: { ambito: "plataforma" },
      });
      const seq = previas.length + 1;
      await delegado("auditoriaGlobal").create({
        data: {
          ambito: "plataforma",
          seq,
          antes: h.antes ?? null,
          despues: h.despues ?? null,
          actorType: h.actorTipo,
          actorId: h.actorId,
          viaUserId: h.viaUserId,
          capability: h.capability,
          tenantObjetivoId: h.tenantObjetivoId,
          origenTenantId: h.origenTenantId,
          entityType: h.entityType,
          entityId: h.entityId,
          payload: JSON.parse(JSON.stringify(h.payload ?? null)),
          createdAt: new Date(),
          hash: `memoria-${seq}`,
        },
      });
      return { id: String(seq), seq, hash: `memoria-${seq}` };
    },
    crearAprobacionPlataforma: (data: Fila) =>
      cola().create({ data: { ...data, estado: "pendiente", createdAt: new Date() } }),
    aprobacionPlataformaRepetida: (where: Fila) => cola().findFirst({ where }),
    aprobacionPlataformaPorId: async (id: string) => {
      await vencer();
      return cola().findUnique({ where: { id } });
    },
    listarAprobacionesPlataforma: async (f: { estado?: string; limite: number }) => {
      await vencer();
      return cola().findMany({
        where: f.estado ? { estado: f.estado } : {},
        orderBy: { createdAt: "desc" },
        take: f.limite,
      });
    },
    resolverAprobacionPlataforma: async (id: string, data: Fila) =>
      (
        await cola().updateMany({
          where: { id, estado: "pendiente", venceEn: { gt: new Date() } },
          data: { ...data, resueltaEn: new Date() },
        })
      ).count,
    guardarResultadoAprobacionPlataforma: (id: string, resultado: unknown, _tx?: unknown) =>
      cola().update({ where: { id }, data: { resultado } }),
    nombresDeUsuarios: (ids: string[]) => delegado("user").findMany({ where: { id: { in: ids } } }),
    listarAuditoriaPlataforma: async (f: {
      capability?: string;
      tenantObjetivoId?: string;
      antesDeSeq?: number;
      limite: number;
    }) =>
      delegado("auditoriaGlobal").findMany({
        where: {
          ambito: "plataforma",
          ...(f.capability ? { capability: { startsWith: f.capability } } : {}),
          ...(f.tenantObjetivoId ? { tenantObjetivoId: f.tenantObjetivoId } : {}),
          ...(f.antesDeSeq ? { seq: { lt: f.antesDeSeq } } : {}),
        },
        orderBy: { seq: "desc" },
        take: f.limite,
      }),
    // Sin concurrencia en memoria: solo el rol vigente de quien pide (el lock real, en Postgres).
    bloquearOwnersDePlataforma: async (_tx: unknown, responsableId: string) =>
      ((await delegado("user").findUnique({ where: { id: responsableId } }))?.["platformRole"] ??
        null) as string | null,
  };
}
