import { z } from "zod";

import {
  PERMISOS_CORE,
  VERSION_CATALOGO_CAMPOS,
  clasificarCampos,
  soloAutorizados,
  valoresContacto,
  valoresCuenta,
  valoresInstalacion,
  type ValorCampo,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { dondeContacto, dondeInstalacion } from "../maestros/alcance";
import { cuentaDe } from "../maestros/cuentas-acceso";
import { finalidadSchema } from "./comun";

const MAX_INSTALACIONES = 50;
const valorSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const registroSchema = z.record(z.string(), valorSchema);

/** Fechas como `AAAA-MM-DD`; el formato de presentación lo aplica `renderizarPlantillaCampos`. */
function serializable(
  v: Record<string, ValorCampo>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(v).map(([k, x]) => [
      k,
      x instanceof Date ? x.toISOString().slice(0, 10) : (x ?? null),
    ]),
  );
}

export const camposResolver = defineCapability({
  // Revela datos de personas (contacto): se audita cada entidad entregada, sin copiar valores.
  auditarLectura: (s) =>
    [s.origen.cuentaId, s.origen.contactoId, ...s.origen.instalacionIds].filter(
      (id): id is string => typeof id === "string",
    ),
  id: "core.campos.resolver",
  descripcion:
    "Entrega los valores del catálogo único de campos para un documento (propuesta, contrato, documento o correo) de una cuenta, su contacto e instalaciones. Solo devuelve campos que la finalidad permite y que el actor puede leer; lo que falta queda nulo y no se inventa.",
  permiso: PERMISOS_CORE.cuentasRead,
  portales: ["erp", "supervisor"],
  input: z.object({
    finalidad: finalidadSchema,
    cuentaId: uuidSchema,
    contactoId: uuidSchema.optional(),
    instalacionIds: z.array(uuidSchema).max(MAX_INSTALACIONES).optional(),
  }),
  output: z.object({
    version: z.number(),
    finalidad: finalidadSchema,
    campos: registroSchema,
    colecciones: z.object({ instalaciones: z.array(registroSchema) }),
    origen: z.object({
      cuentaId: z.string(),
      contactoId: z.string().nullable(),
      instalacionIds: z.array(z.string()),
    }),
    /** Claves que la finalidad declara y el actor no puede leer, o que aún no tienen resolvedor. */
    sinPermiso: z.array(z.string()),
    sinResolvedor: z.array(z.string()),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const clases = clasificarCampos(input.finalidad, (p) => ctx.autorizar(p));
    const permitidas = new Set(clases.autorizados.map((c) => c.clave));
    const cuenta = await cuentaDe(ctx, input.cuentaId);

    const contacto = input.contactoId
      ? await ctx.db.contacto.findFirst({
          where: {
            id: input.contactoId,
            cuentaId: cuenta.id,
            archivadoEn: null,
            anonimizadoEn: null,
            AND: [dondeContacto(ctx)],
          },
        })
      : null;
    if (input.contactoId && !contacto) throw noEncontrado("El contacto");

    const instalaciones = await ctx.db.instalacion.findMany({
      where: {
        cuentaId: cuenta.id,
        archivadaEn: null,
        ...(input.instalacionIds ? { id: { in: input.instalacionIds } } : {}),
        AND: [dondeInstalacion(ctx)],
      },
      orderBy: { nombre: "asc" },
      take: MAX_INSTALACIONES,
    });
    const pedidas = new Set(input.instalacionIds ?? []);
    if (pedidas.size > 0 && instalaciones.length !== pedidas.size) {
      throw noEncontrado("La instalación");
    }

    const campos = {
      ...valoresCuenta(cuenta),
      ...(contacto ? valoresContacto(contacto) : {}),
    };
    return {
      version: VERSION_CATALOGO_CAMPOS,
      finalidad: input.finalidad,
      campos: serializable(soloAutorizados(campos, permitidas)),
      colecciones: {
        instalaciones: instalaciones.map((i) =>
          serializable(soloAutorizados(valoresInstalacion(i), permitidas)),
        ),
      },
      origen: {
        cuentaId: cuenta.id,
        contactoId: contacto?.id ?? null,
        instalacionIds: instalaciones.map((i) => i.id),
      },
      sinPermiso: clases.sinPermiso.map((c) => c.clave),
      sinResolvedor: clases.sinResolvedor.map((c) => c.clave),
    };
  },
});
