import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { listarModulos, obtenerModulo } from "../module";
import { requierePlataforma } from "./comun";
import { emailSchema, uuidSchema } from "./esquemas";
import { invitacionCreadaSchema } from "./invitations";
import { invitarAdministrador } from "./platform-escritura";
import { sembrarModulo } from "./siembras-modulo";

const ACTIVOS = new Set(["activo", "trial"]);

export const platformModulesSet = defineCapability({
  id: "platform.modules.set",
  descripcion:
    "Plataforma: activa, pone en trial o suspende un módulo de una empresa. Valida dependencias del manifest en ambos sentidos.",
  permiso: PERMISOS_PLATAFORMA.modulesManage,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    moduloId: z.string().min(1),
    estado: z.enum(["activo", "trial", "suspendido"]),
  }),
  output: z.object({ moduloId: z.string(), estado: z.string(), anterior: z.string().nullable() }),
  efecto: "escritura",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input, { dryRun }) {
    if (input.moduloId === "core") throw reglaDeNegocio("El núcleo siempre está activo.");
    const manifest = obtenerModulo(input.moduloId);
    if (!manifest) throw noEncontrado(`El módulo "${input.moduloId}"`);
    const db = requierePlataforma(ctx).paraTenant(input.tenantId);
    const filas = await db.tenantModule.findMany();
    const estado = new Map(filas.map((f) => [f.moduloId, f.estado]));

    if (ACTIVOS.has(input.estado)) {
      const faltan = manifest.dependencias.filter((d) => !ACTIVOS.has(estado.get(d) ?? ""));
      if (faltan.length) throw reglaDeNegocio(`Activa antes: ${faltan.join(", ")}.`);
    } else {
      const dependientes = listarModulos()
        .filter(
          (m) => m.dependencias.includes(input.moduloId) && ACTIVOS.has(estado.get(m.id) ?? ""),
        )
        .map((m) => m.nombre);
      if (dependientes.length)
        throw reglaDeNegocio(`Lo usan módulos activos: ${dependientes.join(", ")}.`);
    }
    const anterior = estado.get(input.moduloId) ?? null;
    if (!dryRun) {
      await db.tenantModule.upsert({
        where: { tenantId_moduloId: { tenantId: input.tenantId, moduloId: input.moduloId } },
        update: { estado: input.estado },
        create: { tenantId: input.tenantId, moduloId: input.moduloId, estado: input.estado },
      });
      if (ACTIVOS.has(input.estado)) await sembrarModulo(input.moduloId, db, input.tenantId);
    }
    return { moduloId: input.moduloId, estado: input.estado, anterior };
  },
});

export const platformAdminsInvite = defineCapability({
  id: "platform.admins.invite",
  descripcion:
    "Plataforma: invita a un owner o admin a una empresa (por ejemplo, su primer administrador).",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    email: emailSchema,
    rol: z.enum(["owner", "admin"]).default("owner"),
  }),
  output: invitacionCreadaSchema,
  // Irreversible (ADR-055): invitar un owner abre todos los datos de la empresa; un agente con key
  // de plataforma queda en aprobación humana salvo autonomía directa dada por plataforma.
  efecto: "irreversible",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input, { dryRun }) {
    const tenant = await requierePlataforma(ctx).globales.tenantPorId(input.tenantId);
    if (!tenant) throw noEncontrado("La empresa");
    return invitarAdministrador(ctx, tenant, input.email, input.rol, dryRun);
  },
});
