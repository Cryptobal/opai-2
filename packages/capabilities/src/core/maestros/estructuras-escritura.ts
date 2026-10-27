import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { aFecha, dia, escribirConEvento } from "./comun";
import { DIA_MS, entrada, referencia } from "./estructuras-ref";
import { ocultarMontos } from "./estructuras-acceso";
import { dondeEstructura } from "./estructuras-alcance";
import { estructuraSchema, vistaEstructura } from "./estructuras-vista";

export const estructurasCreate = defineCapability({
  id: "core.estructuras.create",
  descripcion:
    "Crea una versión de estructura de sueldo (nivel cargo, puesto o persona) desde una fecha. Cierra la versión anterior el día previo; si ya hay una versión desde esa fecha o después, responde error.",
  permiso: PERMISOS_CORE.estructurasManage,
  input: entrada,
  output: estructuraSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const ref = await referencia(ctx, input);
    const desde = aFecha(input.vigenteDesde);
    const vigentes = await ctx.db.estructuraSueldo.findMany({
      where: { nivel: input.nivel, [ref.campo]: ref.id, estado: "vigente" },
    });
    const posterior = vigentes.find((v) => v.vigenteDesde >= desde);
    if (posterior) {
      throw reglaDeNegocio(
        `Ya hay una versión vigente desde ${dia(posterior.vigenteDesde)}: anúlala o usa una fecha posterior.`,
      );
    }
    const abierta = vigentes.find((v) => !v.vigenteHasta || v.vigenteHasta >= desde);
    const items = input.items;
    const data = {
      nivel: input.nivel,
      ...ref.refs,
      ...ref.conceptos,
      gratificacionMonto: input.gratificacionMonto ?? null,
      motivo: input.motivo ?? null,
      vigenteDesde: desde,
      estado: "vigente",
    };
    if (dryRun) {
      // Sin fila persistida todavía: `ocultarMontos` no tiene id que auditar (nada se reveló aún).
      return vistaEstructura({ ...data, id: "" }, items, await ocultarMontos(ctx, data));
    }
    const e = await escribirConEvento(
      ctx,
      {
        tipo: "core.estructura.creada",
        entidadTipo: "estructura",
        payload: () => ({
          nivel: input.nivel,
          ref: ref.id,
          desde: input.vigenteDesde,
          cierra: abierta?.id ?? null,
        }),
      },
      async (tx) => {
        if (abierta) {
          await tx.estructuraSueldo.update({
            where: { id: abierta.id },
            data: { vigenteHasta: new Date(desde.getTime() - DIA_MS) },
          });
        }
        const nueva = await tx.estructuraSueldo.create({
          data: { ...data, tenantId: ctx.tenantId, creadoPor: ctx.usuario?.id ?? null },
        });
        for (const [orden, i] of items.entries()) {
          await tx.estructuraItem.create({
            data: {
              ...i,
              monto: i.monto ?? null,
              porcentaje: i.porcentaje ?? null,
              orden,
              tenantId: ctx.tenantId,
              estructuraId: nueva.id,
            },
          });
        }
        return nueva;
      },
    );
    // Recién con `e.id` (la fila ya persistida) `ocultarMontos` puede auditar la revelación: la
    // respuesta de creación entrega los mismos montos sensibles que un `get`, así que queda trazada
    // igual (quién, cuándo, qué).
    return vistaEstructura(e, items, await ocultarMontos(ctx, e));
  },
});

export const estructurasAnular = defineCapability({
  id: "core.estructuras.anular",
  descripcion:
    "IRREVERSIBLE: anula una versión de estructura de sueldo cargada por error, con motivo. No reabre la versión anterior: crea una nueva si corresponde.",
  permiso: PERMISOS_CORE.estructurasManage,
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(5).max(500) }),
  output: estructuraSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    // findFirst (no findUnique) para aplicar el alcance por filas: fuera de alcance = no encontrada,
    // igual que en lectura (`core.estructuras.get`) y sin distinguir el caso de otro tenant.
    const e = await ctx.db.estructuraSueldo.findFirst({
      where: { id: input.id, AND: [await dondeEstructura(ctx)] },
    });
    if (!e) throw noEncontrado("La estructura");
    if (e.estado === "anulada") throw reglaDeNegocio("La estructura ya está anulada.");
    const items = await ctx.db.estructuraItem.findMany({
      where: { estructuraId: e.id },
      orderBy: { orden: "asc" },
    });
    const data = {
      estado: "anulada",
      motivo: `${e.motivo ? `${e.motivo} · ` : ""}Anulada: ${input.motivo}`,
    };
    const ocultar = await ocultarMontos(ctx, e);
    if (dryRun) return vistaEstructura({ ...e, ...data }, items, ocultar);
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.estructura.anulada",
        entidadTipo: "estructura",
        payload: () => ({ motivo: input.motivo }),
      },
      (tx) => tx.estructuraSueldo.update({ where: { id: e.id }, data }),
    );
    return vistaEstructura(r, items, ocultar);
  },
});
