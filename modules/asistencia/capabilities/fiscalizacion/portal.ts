import { z } from "zod";

import { defineCapability, reglaDeNegocio, type ModoEjecucion } from "@opai/capabilities";
import { empleadorPorRut, resolverClaveFiscalizacion } from "@opai/db";

import { esCorreoDt, hashClaveFiscalizacion, rutEmpleadorCanonico } from "../../domain/fiscalizacion";

export const fiscalizacionPortalIngresar = defineCapability({
  id: "asistencia.fiscalizacion_ingreso.validar",
  descripcion: "Valida el ingreso al portal de fiscalización y deja lista la sesión de solo lectura.",
  permiso: null,
  interna: true,
  input: z.object({
    correo: z.string().email(),
    rutEmpleador: z.string().min(3).max(20),
    clave: z.string().min(8).max(40).optional(),
    ip: z.string().max(80).optional(),
    dryRun: z.boolean().optional(),
  }),
  output: z.object({
    via: z.enum(["correo", "clave"]),
    correo: z.string(),
    empleadorRut: z.string(),
    slug: z.string(),
    razonSocial: z.string().nullable(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, modo: ModoEjecucion) {
    const canon = rutEmpleadorCanonico(i.rutEmpleador);
    if (!canon) throw reglaDeNegocio("Revisa el RUT del empleador.");
    const emp = await empleadorPorRut(canon);
    if (!emp || emp.tenantId !== ctx.tenantId) throw reglaDeNegocio("No hay un empleador con ese RUT en OPAI.");
    const correo = i.correo.trim().toLowerCase();
    if (modo.dryRun) {
      return { via: "correo" as const, correo, empleadorRut: emp.rut, slug: emp.slug, razonSocial: emp.razonSocial };
    }
    let via: "correo" | "clave" = "correo";
    if (i.clave?.trim()) {
      const res = await resolverClaveFiscalizacion(hashClaveFiscalizacion(i.clave));
      if (!res || res.tenantId !== ctx.tenantId) throw reglaDeNegocio("La clave temporal no es válida.");
      if (res.revocadoEn) throw reglaDeNegocio("Esta clave fue revocada.");
      if (res.venceEn.getTime() < Date.now()) throw reglaDeNegocio("Esta clave venció.");
      if (res.correo !== correo) throw reglaDeNegocio("El correo no coincide con la clave.");
      via = "clave";
      await ctx.db.fiscalizacionClave.update({
        where: { id: res.claveId },
        data: { usos: { increment: 1 } },
      });
    } else if (!esCorreoDt(correo)) {
      throw reglaDeNegocio("Usa tu correo institucional @dt.gob.cl o una clave temporal.");
    }
    await ctx.db.fiscalizacionAcceso.create({
      data: {
        tenantId: ctx.tenantId, correo, empleadorRut: emp.rut, via, ip: i.ip ?? null,
        detalle: "Ingreso al portal de fiscalización",
      },
    });
    return { via, correo, empleadorRut: emp.rut, slug: emp.slug, razonSocial: emp.razonSocial };
  },
});