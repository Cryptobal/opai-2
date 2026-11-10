import { z } from "zod";

import { listaParaFacturar, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import type { TONOS_ETIQUETA } from "../crm/comun";
import { conEtiqueta, etiquetasFilaSchema, filtroEtiqueta } from "../crm/etiquetas-filas";
import { dondeCuenta, dondeInstalacion } from "./alcance";
import { cursorDe, listaSchema, pagina } from "./comun";
import { facturarSchema } from "./cuentas-sii-esquemas";
import { cuentaSchema, ESTADOS_CUENTA, vistaCuenta } from "./cuentas-vista";
export { cuentaDe } from "./cuentas-acceso";

export const cuentasList = defineCapability({
  auditarLectura: (s) => s.items.map((c) => c.id),
  id: "core.cuentas.list",
  descripcion:
    "Lista las cuentas (clientes y prospectos) de la empresa, con búsqueda por nombre, razón social o RUT y filtro por estado. Cada fila dice si está lista para facturar o qué le falta (sin consultar al SII). Paginada por cursor.",
  permiso: PERMISOS_CORE.cuentasRead,
  input: listaSchema.extend({ estado: z.enum(ESTADOS_CUENTA).optional(), etiquetaId: filtroEtiqueta }),
  output: z.object({
    items: z.array(
      cuentaSchema.extend({
        instalaciones: z.number(),
        contactoPrincipal: z.string().nullable(),
        etiquetas: etiquetasFilaSchema,
        /** «Lista para facturar» (CAR-156): mismo dominio que `core.cuentas.facturable`. */
        facturar: facturarSchema,
      }),
    ),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const q = input.q;
    // Instalaciones activas (conteo) y contacto principal van en la misma consulta (_count + include),
    // no en consultas por página aparte (ADR-045).
    const filas = await ctx.db.cuenta.findMany({
      where: {
        AND: [dondeCuenta(ctx)],
        ...(input.incluirArchivadas ? {} : { archivadaEn: null }),
        ...(input.estado ? { estado: input.estado } : {}),
        ...conEtiqueta(input.etiquetaId),
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: "insensitive" as const } },
                { razonSocial: { contains: q, mode: "insensitive" as const } },
                { rut: { startsWith: q.replace(/[.\s]/g, "").toUpperCase() } },
              ],
            }
          : {}),
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
      include: {
        _count: {
          select: {
            instalaciones: { where: { archivadaEn: null, AND: [dondeInstalacion(ctx)] } },
            // Destinatarios de facturación para «Lista para facturar», sin una consulta por fila.
            contactoVinculos: { where: { roles: { has: "facturacion" } } },
          },
        },
        contactos: {
          where: { esPrincipal: true, archivadoEn: null },
          select: { nombres: true, apellidos: true },
          take: 1,
        },
        // Etiquetas activas de la fila en la misma operación: una consulta menos por navegación (ADR-045).
        etiquetaAsignaciones: {
          where: { etiqueta: { activa: true } },
          select: { etiqueta: { select: { id: true, nombre: true, tono: true } } },
          orderBy: { etiqueta: { nombre: "asc" } },
        },
      },
    });
    const p = pagina(filas, input.limite);
    return {
      items: p.items.map((c) => {
        const principal = c.contactos[0];
        return {
          ...vistaCuenta(c),
          instalaciones: c._count.instalaciones,
          contactoPrincipal: principal ? `${principal.nombres} ${principal.apellidos}` : null,
          etiquetas: c.etiquetaAsignaciones.map((a) => ({
            id: a.etiqueta.id,
            nombre: a.etiqueta.nombre,
            tono: a.etiqueta.tono as (typeof TONOS_ETIQUETA)[number],
          })),
          facturar: listaParaFacturar({ ...c, contactosFacturacion: c._count.contactoVinculos }),
        };
      }),
      siguiente: p.siguiente,
    };
  },
});
export { cuentasGet } from "./cuentas-get";
