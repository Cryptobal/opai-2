import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { iso, requierePlataforma } from "./comun";
import { modulosConEstado, moduloEstadoSchema, resumenUso, usoSchema } from "./consultas";
import { tenantSchema, uuidSchema } from "./esquemas";
import { estadoInvitacion } from "./invitar";

export const platformTenantsGet = defineCapability({
  id: "platform.tenants.get",
  descripcion:
    "Plataforma: detalle de una empresa (datos, módulos, administradores, invitaciones, API keys y uso de 30 días).",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema }),
  output: z.object({
    tenant: tenantSchema,
    modulos: z.array(moduloEstadoSchema),
    administradores: z.array(
      z.object({
        membershipId: z.string(),
        nombre: z.string(),
        email: z.string(),
        rol: z.string(),
        estado: z.string(),
      }),
    ),
    invitaciones: z.array(
      z.object({ id: z.string(), email: z.string(), rol: z.string(), estado: z.string() }),
    ),
    apiKeys: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        prefijo: z.string(),
        scopes: z.array(z.string()),
        ultimoUsoEn: z.string().nullable(),
        revocadaEn: z.string().nullable(),
      }),
    ),
    uso: usoSchema,
  }),
  efecto: "lectura",
  dryRun: false,
  // NÚCLEO-H / CAR-323: la lectura queda en la auditoría global con la empresa objetivo.
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const p = requierePlataforma(ctx);
    const tenant = await p.globales.tenantPorId(input.tenantId);
    if (!tenant) throw noEncontrado("La empresa");
    const e = p.empresa(tenant.id);
    const [modulos, admins, invitaciones, keys, uso] = await Promise.all([
      e.modulos().then(modulosConEstado),
      e.administradores(),
      e.invitaciones(),
      e.apiKeys(),
      resumenUso(e, 30),
    ]);
    return {
      tenant,
      modulos,
      administradores: admins.map((m) => ({
        membershipId: m.id,
        nombre: m.user.name,
        email: m.user.email,
        rol: m.rol,
        estado: m.estado,
      })),
      invitaciones: invitaciones
        .map((i) => ({ id: i.id, email: i.email, rol: i.rol, estado: estadoInvitacion(i) }))
        .filter((i) => i.estado === "pendiente"),
      apiKeys: keys.map((k) => ({
        ...k,
        ultimoUsoEn: iso(k.ultimoUsoEn),
        revocadaEn: iso(k.revocadaEn),
      })),
      uso,
    };
  },
});
