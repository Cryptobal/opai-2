import { sinDuplicado } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { estadoDeTipo } from "./dominio";
import type { Plan } from "./solicitudes-convertir-plan";
import { resolverAvisosSolicitud } from "./solicitudes-avisos";
import { partirNombre } from "./solicitudes-dominio";

export type AplicarConversion = {
  solicitud: { id: string; comuna: string | null; primeraRespuestaEn?: Date | null };
  datos: {
    nombre: string | null;
    empresa: string | null;
    email: string | null;
    telefono: string | null;
    rut: string | null;
    servicio: string | null;
  };
  plan: Plan;
  cuentaNombreNueva: string;
  responsableId: string | null;
  embudoId: string;
  etapa: { id: string; tipo: string; probabilidad: number };
  ahora: Date;
};

/** Crea o reutiliza cuenta y contacto, abre el negocio y cierra la solicitud, todo en una transacción. */
export async function aplicarConversion(ctx: Contexto, a: AplicarConversion) {
  return ctx.transaccion(async (tx) => {
    let cuentaId = a.plan.cuenta.id;
    if (!cuentaId) {
      const c = await sinDuplicado(
        tx.cuenta.create({
          data: {
            tenantId: ctx.tenantId,
            nombre: a.cuentaNombreNueva,
            estado: "prospecto",
            origen: "solicitud",
            ...(a.datos.rut ? { rut: a.datos.rut } : {}),
            ...(a.solicitud.comuna ? { comuna: a.solicitud.comuna } : {}),
          },
        }),
        "Ya existe una cuenta con ese RUT.",
      );
      cuentaId = c.id;
      await ctx.eventos.emitir(tx, {
        tipo: "core.cuenta.creada",
        entidadTipo: "cuenta",
        entidadId: c.id,
        payload: {},
      });
    }
    let contactoId = a.plan.contacto.id;
    if (!contactoId && a.plan.contacto.accion === "crea") {
      const n = partirNombre(a.datos.nombre);
      const c = await tx.contacto.create({
        data: {
          tenantId: ctx.tenantId,
          cuentaId,
          ...n,
          estado: "activo",
          esPrincipal: !a.plan.cuenta.id,
          roles: ["comercial"],
          ...(a.datos.email ? { email: a.datos.email } : {}),
          ...(a.datos.telefono ? { telefono: a.datos.telefono } : {}),
        },
      });
      contactoId = c.id;
      await ctx.eventos.emitir(tx, {
        tipo: "core.contacto.creado",
        entidadTipo: "contacto",
        entidadId: c.id,
        payload: {},
      });
    }
    const negocio = await tx.negocio.create({
      data: {
        tenantId: ctx.tenantId,
        titulo: a.plan.negocio.titulo,
        cuentaId,
        embudoId: a.embudoId,
        etapaId: a.etapa.id,
        estado: estadoDeTipo(a.etapa.tipo),
        probabilidad: a.etapa.probabilidad,
        responsableId: a.responsableId,
      },
    });
    await tx.historialEtapa.create({
      data: {
        tenantId: ctx.tenantId,
        negocioId: negocio.id,
        aEtapaId: a.etapa.id,
        actorTipo: ctx.actor.tipo,
        actorId: ctx.actor.id ?? null,
      },
    });
    if (contactoId) {
      await tx.negocioContacto.create({
        data: {
          tenantId: ctx.tenantId,
          negocioId: negocio.id,
          contactoId,
          rol: "decisor",
          esPrincipal: true,
        },
      });
    }
    const sol = await tx.solicitud.update({
      where: { id: a.solicitud.id },
      data: {
        ...a.datos,
        estado: "convertida",
        convertidaEn: a.ahora,
        ...(a.solicitud.primeraRespuestaEn ? {} : { primeraRespuestaEn: a.ahora }),
        negocioId: negocio.id,
        cuentaId,
        contactoId,
      },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "comercial.negocio.creado",
      entidadTipo: "negocio",
      entidadId: negocio.id,
      payload: { cuentaId, etapaId: a.etapa.id, instalaciones: [], solicitudId: a.solicitud.id },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "comercial.solicitud.convertida",
      entidadTipo: "solicitud",
      entidadId: a.solicitud.id,
      payload: { negocioId: negocio.id, cuentaId, contactoId },
    });
    await resolverAvisosSolicitud(tx, ctx.tenantId, a.solicitud.id);
    return { sol, negocioId: negocio.id, cuentaId, contactoId };
  });
}
