import { z } from "zod";

import { esRutRepetido } from "@opai/db";
import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { conflicto, noEncontrado } from "../errores";
import { requierePlataforma } from "./comun";
import { uuidSchema } from "./esquemas";
import { rutSchema } from "./maestros/comun";

/** Razón social tal como aparece en las facturas que OPAI le emite a la empresa. */
export const razonSocialSchema = z.string().trim().min(2).max(160);

export const MENSAJE_RUT_REPETIDO =
  "Ese RUT ya está registrado en otra empresa. Revisa que sea el de esta empresa.";

const perfilSchema = z.object({
  razonSocial: z.string().nullable(),
  rut: z.string().nullable().describe('Forma canónica sin puntos, por ejemplo "76123456-7".'),
});

export const platformTenantsPerfilGet = defineCapability({
  id: "platform.tenants.perfil_get",
  descripcion:
    "Plataforma: razón social y RUT tributario de una empresa (a quien OPAI le factura). Sin RUT no se puede abrir una prueba de módulo.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema }),
  output: perfilSchema.extend({ tenantId: z.string(), completo: z.boolean() }),
  efecto: "lectura",
  dryRun: false,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const p = requierePlataforma(ctx);
    if (!(await p.globales.tenantPorId(input.tenantId))) throw noEncontrado("La empresa");
    const perfil = await p.empresa(input.tenantId).perfilTributario();
    const razonSocial = perfil?.razonSocial ?? null;
    const rut = perfil?.rut ?? null;
    return { tenantId: input.tenantId, razonSocial, rut, completo: Boolean(razonSocial && rut) };
  },
});

export const platformTenantsPerfilSet = defineCapability({
  id: "platform.tenants.perfil_set",
  descripcion:
    "Plataforma: fija o corrige la razón social y el RUT tributario de una empresa (se valida el dígito verificador y que ninguna otra empresa tenga ese RUT). La vista previa no guarda y no puede detectar un RUT repetido: eso se comprueba al guardar.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema, razonSocial: razonSocialSchema, rut: rutSchema }),
  output: z.object({
    tenantId: z.string(),
    antes: perfilSchema.nullable(),
    despues: perfilSchema,
  }),
  efecto: "escritura",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  cambio: (s) => ({ antes: s.antes, despues: s.despues }),
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    if (!(await p.globales.tenantPorId(input.tenantId))) throw noEncontrado("La empresa");
    const e = p.empresa(input.tenantId);
    const antes = await e.perfilTributario();
    const despues = { razonSocial: input.razonSocial, rut: input.rut };
    if (!dryRun)
      await e
        .fijarPerfilTributario({ rut: input.rut, razonSocial: input.razonSocial })
        .catch((x) => {
          throw esRutRepetido(x) ? conflicto(MENSAJE_RUT_REPETIDO) : x;
        });
    return {
      tenantId: input.tenantId,
      antes: antes ? { razonSocial: antes.razonSocial, rut: antes.rut } : null,
      despues,
    };
  },
});
