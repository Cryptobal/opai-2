import { z } from "zod";

import { conflicto, defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { direccionSchema, misDatosSchema, telefono, vistaMisDatos } from "./mis-datos-vista";
import { personaPropia, usuarioDe } from "./persona-propia";

const PORTALES = ["trabajador"] as const;

export const misDatosObtener = defineCapability({
  id: "portal_trabajador.mis_datos.obtener",
  descripcion:
    "Devuelve los datos de la propia persona del trabajador: nombre, RUT, correos, teléfono y dirección, más lo que le falta completar. Solo lee a la persona vinculada a su usuario, nunca a otra.",
  permiso: null,
  portales: PORTALES,
  auditarLectura: (s) => [s.personaId],
  input: z.object({}),
  output: misDatosSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    return vistaMisDatos(await personaPropia(ctx));
  },
});

export const misDatosActualizar = defineCapability({
  id: "portal_trabajador.mis_datos.actualizar",
  descripcion:
    "Actualiza el teléfono, el correo personal o la dirección (con Google Maps) de la propia persona del trabajador. Solo cambia lo enviado; el nombre, el RUT y el correo laboral los gestiona RR.HH. Acepta vista previa.",
  permiso: null,
  portales: PORTALES,
  input: z
    .object({
      telefono: telefono.nullable().optional(),
      emailPersonal: z.email().max(254).nullable().optional(),
      direccion: direccionSchema.nullable().optional(),
    })
    .refine((v) => Object.values(v).some((x) => x !== undefined), {
      message: "Indica al menos un dato a actualizar.",
    }),
  output: misDatosSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await personaPropia(ctx);
    const d = input.direccion;
    const data = {
      ...(input.telefono !== undefined ? { telefono: input.telefono } : {}),
      ...(input.emailPersonal !== undefined ? { emailPersonal: input.emailPersonal } : {}),
      ...(d === undefined
        ? {}
        : {
            calle: d?.calle ?? null,
            comuna: d?.comuna ?? null,
            region: d?.region ?? null,
            direccionFormateada: d?.direccionFormateada ?? null,
            placeId: d?.placeId ?? null,
            lat: d?.lat ?? null,
            lng: d?.lng ?? null,
          }),
    };
    if (dryRun) return vistaMisDatos({ ...actual, ...data });
    const guardada = await ctx.transaccion(async (tx) => {
      // Mismo filtro que `personaPropia`: la fila solo se escribe si sigue siendo la de este usuario.
      const r = await tx.persona.updateMany({
        where: { id: actual.id, usuarioId: usuarioDe(ctx), archivadaEn: null, anonimizadaEn: null },
        data,
      });
      if (r.count !== 1) throw conflicto("Tu ficha cambió. Recarga y vuelve a intentarlo.");
      const fila = await tx.persona.findUnique({ where: { id: actual.id } });
      if (!fila) throw reglaDeNegocio("Tu ficha de persona no está disponible.");
      await ctx.eventos.emitir(tx, {
        tipo: "portal_trabajador.mis_datos.actualizados",
        entidadTipo: "persona",
        entidadId: actual.id,
        payload: { campos: Object.keys(data) },
      });
      return fila;
    });
    return vistaMisDatos(guardada);
  },
});
