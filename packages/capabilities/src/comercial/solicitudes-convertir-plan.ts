import { z } from "zod";

import { dondeCuenta, dondeContacto } from "../core/maestros/alcance";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { partirNombre, tituloNegocio } from "./solicitudes-dominio";
import { cuentaValida } from "./validaciones";

export const accionPlan = z.enum(["reutiliza", "crea", "sin_contacto"]);

export const planSchema = z.object({
  cuenta: z.object({ accion: accionPlan, id: z.string().nullable(), nombre: z.string() }),
  contacto: z.object({
    accion: accionPlan,
    id: z.string().nullable(),
    nombre: z.string().nullable(),
  }),
  negocio: z.object({ titulo: z.string() }),
});
export type Plan = z.infer<typeof planSchema>;

export type DatosConversion = {
  nombre: string | null;
  empresa: string | null;
  email: string | null;
  telefono: string | null;
  rut: string | null;
  servicio: string | null;
};

/**
 * Decide qué se reutiliza y qué se crea al convertir (sin escribir). Reutiliza por cuenta indicada,
 * por RUT de la cuenta o por correo de un contacto vigente; si nada coincide, crea. Nunca bloquea: un
 * duplicado posible se propone como reutilización (comercial.md, «Convertir en un paso»).
 */
export async function resolverPlan(
  ctx: Contexto,
  d: DatosConversion,
  titulo: string | undefined,
  cuentaId: string | undefined,
): Promise<Plan & { cuentaNombreNueva: string }> {
  const nombreCuenta = (d.empresa ?? d.nombre)?.trim();
  if (!cuentaId && !nombreCuenta)
    throw reglaDeNegocio("Falta el nombre de la empresa o de la persona para crear la cuenta.");

  let cuenta: { id: string; nombre: string } | null = null;
  let contacto: { id: string; nombres: string; apellidos: string } | null = null;
  if (cuentaId) {
    await cuentaValida(ctx, cuentaId);
    cuenta = await ctx.db.cuenta.findFirst({
      where: { id: cuentaId, AND: [dondeCuenta(ctx)] },
      select: { id: true, nombre: true },
    });
  } else if (d.rut) {
    cuenta = await ctx.db.cuenta.findFirst({
      where: { rut: d.rut, archivadaEn: null, AND: [dondeCuenta(ctx)] },
      select: { id: true, nombre: true },
    });
  }
  if (!cuenta && d.email) {
    const c = await ctx.db.contacto.findFirst({
      where: { email: d.email, archivadoEn: null, AND: [dondeContacto(ctx)] },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        cuenta: { select: { id: true, nombre: true } },
      },
    });
    if (c) {
      cuenta = c.cuenta;
      contacto = c;
    }
  }
  if (cuenta && !contacto && d.email) {
    contacto = await ctx.db.contacto.findFirst({
      where: { cuentaId: cuenta.id, email: d.email, archivadoEn: null },
      select: { id: true, nombres: true, apellidos: true },
    });
  }
  const hayDatosContacto = Boolean(d.nombre?.trim() || d.email || d.telefono);
  const nombreContacto = d.nombre ? d.nombre.trim() : null;
  const nombreCuentaFinal = cuenta?.nombre ?? nombreCuenta ?? "";
  return {
    cuenta: {
      accion: cuenta ? "reutiliza" : "crea",
      id: cuenta?.id ?? null,
      nombre: nombreCuentaFinal,
    },
    contacto: contacto
      ? {
          accion: "reutiliza",
          id: contacto.id,
          nombre: `${contacto.nombres} ${contacto.apellidos}`,
        }
      : hayDatosContacto
        ? { accion: "crea", id: null, nombre: nombreContacto }
        : { accion: "sin_contacto", id: null, nombre: null },
    negocio: { titulo: titulo ?? tituloNegocio(nombreCuentaFinal, d.servicio) },
    cuentaNombreNueva: nombreCuenta ?? nombreCuentaFinal,
  };
}

export { partirNombre };
