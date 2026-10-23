import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { porLotes } from "./metricas";
import { iso, requierePlataforma } from "../comun";
import { uuidSchema } from "../esquemas";

const ESTADOS = ["pendiente", "en_curso", "hecho", "fallido", "cancelado"] as const;

export const platformTrabajosList = defineCapability({
  id: "platform.trabajos.list",
  descripcion:
    "Plataforma: cola de trabajos de una empresa o de todas (pendientes, en curso, fallidos), más reciente primero, con intentos, último error y payload. 'conProblemas' deja los fallidos y los que están reintentando.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema.optional().describe("Sin empresa: todas (una consulta por empresa)."),
    estado: z.enum(ESTADOS).optional(),
    conProblemas: z.boolean().default(false),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      tenantId: z.string(),
      empresa: z.string(),
      slug: z.string(),
      tipo: z.string(),
      estado: z.string(),
      intentos: z.number(),
      maxIntentos: z.number(),
      programadoPara: z.string().nullable(),
      actualizadoEn: z.string().nullable(),
      ultimoError: z.string().nullable(),
      payload: z.unknown(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const p = requierePlataforma(ctx);
    const tenants = await p.globales.tenant.findMany({
      where: input.tenantId ? { id: input.tenantId } : {},
      orderBy: { nombre: "asc" },
    });
    const where = input.conProblemas
      ? {
          OR: [
            { estado: "fallido" },
            { estado: { in: ["pendiente", "en_curso"] }, intentos: { gt: 0 } },
          ],
        }
      : input.estado
        ? { estado: input.estado }
        : {};
    const listas = await porLotes(tenants, async (t) => {
      const filas = await p.paraTenant(t.id).trabajo.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: input.limite,
      });
      return filas.map((f) => ({
        id: f.id,
        tenantId: t.id,
        empresa: t.nombre,
        slug: t.slug,
        tipo: f.tipo,
        estado: f.estado,
        intentos: f.intentos,
        maxIntentos: f.maxIntentos,
        programadoPara: iso(f.programadoPara),
        actualizadoEn: iso(f.updatedAt),
        ultimoError: f.ultimoError,
        payload: f.payload,
      }));
    });
    return listas
      .flat()
      .sort((a, b) => (b.actualizadoEn ?? "").localeCompare(a.actualizadoEn ?? ""))
      .slice(0, input.limite);
  },
});
