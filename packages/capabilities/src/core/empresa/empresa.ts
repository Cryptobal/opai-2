import { z } from "zod";

import { normalizarRut, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import type { Contexto } from "../../types";
import {
  definidos,
  escribirConEvento,
  rutSchema,
  telefonoSchema,
  textoOpcional,
} from "../maestros/comun";

const email = z.string().trim().toLowerCase().pipe(z.email()).nullable().optional();

const campos = {
  razonSocial: textoOpcional(200),
  rut: rutSchema.nullable().optional(),
  giro: textoOpcional(200),
  calle: textoOpcional(200),
  comuna: textoOpcional(80),
  region: textoOpcional(80),
  representanteNombre: textoOpcional(160),
  representanteRut: rutSchema.nullable().optional(),
  representanteEmail: email,
  correoComercial: email,
  correoOperaciones: email,
  correoFinanzas: email,
  correoContacto: email,
  telefono: telefonoSchema.nullable().optional(),
  whatsapp: telefonoSchema.nullable().optional(),
  sitioWeb: textoOpcional(200),
};
const CLAVES = Object.keys(campos) as (keyof typeof campos)[];

export const empresaSchema = z.object(
  Object.fromEntries(CLAVES.map((k) => [k, z.string().nullable()])) as Record<
    keyof typeof campos,
    z.ZodNullable<z.ZodString>
  >,
);

export async function perfilDe(ctx: Contexto) {
  return ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } });
}

const vista = (p: Partial<Record<string, unknown>> | null) =>
  Object.fromEntries(
    CLAVES.map((k) => [k, (p?.[k] as string | null | undefined) ?? null]),
  ) as Record<keyof typeof campos, string | null>;

export const empresaGet = defineCapability({
  auditarLectura: () => [], // Perfil identificado por tenantId, sin copiar RUT ni contactos.
  id: "core.empresa.get",
  descripcion:
    "Perfil legal y de contacto de la empresa: razón social, RUT, giro, dirección, representante legal y correos por área.",
  permiso: PERMISOS_CORE.tenantRead,
  input: z.object({}),
  output: empresaSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx) => vista(await perfilDe(ctx)),
});

export const empresaUpdate = defineCapability({
  id: "core.empresa.update",
  descripcion:
    "Actualiza el perfil legal y de contacto de la empresa (se usa en contratos, correos y documentos). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.tenantManage,
  input: z.object(campos),
  output: empresaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await perfilDe(ctx);
    // El RUT identifica a la empresa ante OPAI (facturas, pruebas, unicidad entre empresas): lo fija
    // y corrige Plataforma con `platform.tenants.perfil_set`; la empresa puede reenviarlo igual (CAR-188).
    const rutActual = actual?.rut ? (normalizarRut(actual.rut) ?? actual.rut) : null;
    if (input.rut !== undefined && input.rut !== rutActual)
      throw prohibido(
        "El RUT de la empresa lo administra OPAI. Si hay que corregirlo, contacta a soporte.",
      );
    const data = definidos(input);
    if (dryRun) return vista({ ...actual, ...data });
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.empresa.actualizada",
        entidadTipo: "perfil_empresa",
        payload: () => ({ campos: Object.keys(data) }),
      },
      (tx) =>
        tx.perfilEmpresa.upsert({
          where: { tenantId: ctx.tenantId },
          create: { ...data, tenantId: ctx.tenantId },
          update: data,
        }),
    );
    return vista(r);
  },
});
