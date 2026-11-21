import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { cursorDe, pagina } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { instalacionEnAlcance } from "../rondas/comun";
import { PERMISO_READ } from "./comun";
import { PERMISO_CONFIG } from "./config-comun";
import { inputPaginaAcceso } from "./pagina-alcance";
import { MAX_PUNTOS, puntosDe, puntoSchema } from "./puntos-comun";

const salida = z.object({ items: z.array(puntoSchema) });

export const puntosListar = defineCapability({
  id: "acceso.puntos.list",
  descripcion:
    "Lista los puntos de acceso de una instalación (portería principal, acceso vehicular, etc.) en su orden, con su tipo (peatonal, vehicular o mixto) y si están activos. La portería ofrece los activos y cada registro guarda por cuál entró.",
  permiso: PERMISO_READ,
  input: z.object({ instalacionId: uuidSchema, ...inputPaginaAcceso }),
  output: salida.extend({ siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((p) => p.id),
  async handler(ctx, { instalacionId, cursor, limite }) {
    await instalacionEnAlcance(ctx, instalacionId);
    const filas = await puntosDe(ctx, instalacionId, cursorDe(cursor, limite));
    return pagina(filas, limite, cursor);
  },
});

const puntoEntrada = puntoSchema.omit({ id: true }).extend({ id: uuidSchema.optional() });
const SIN_ID = "00000000-0000-0000-0000-000000000000";

export const puntosCambiar = defineCapability({
  id: "acceso.puntos.set",
  descripcion:
    "Define los puntos de acceso de una instalación en el orden dado: crea los que vienen sin `id` y cambia nombre, tipo o estado de los que lo traen. Un punto que ya existe y no viene en la lista queda inactivo (no se borra: sus registros lo referencian). Un agente necesita aprobación humana.",
  permiso: PERMISO_CONFIG,
  input: z.object({ instalacionId: uuidSchema, puntos: z.array(puntoEntrada).max(MAX_PUNTOS) }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, { instalacionId, puntos }, { dryRun }) {
    await instalacionEnAlcance(ctx, instalacionId);
    const actuales = await puntosDe(ctx, instalacionId);
    const ajeno = puntos.find((p) => p.id && !actuales.some((a) => a.id === p.id));
    if (ajeno) throw reglaDeNegocio(`El punto «${ajeno.nombre}» no es de esta instalación.`);
    const quedan = actuales
      .filter((a) => !puntos.some((p) => p.id === a.id))
      .map((a) => ({ ...a, activo: false }));
    const items = [...puntos.map((p) => ({ ...p, id: p.id ?? SIN_ID })), ...quedan];
    if (new Set(items.map((p) => p.nombre.toLowerCase())).size !== items.length)
      throw reglaDeNegocio("Hay dos puntos con el mismo nombre (también cuentan los inactivos).");
    if (dryRun) return { items };
    for (const [orden, p] of items.entries()) {
      const datos = { nombre: p.nombre, tipo: p.tipo, activo: p.activo, orden };
      if (p.id !== SIN_ID) await ctx.db.puntoAcceso.update({ where: { id: p.id }, data: datos });
      else
        await ctx.db.puntoAcceso.create({
          data: { ...datos, tenantId: ctx.tenantId, instalacionId },
        });
    }
    return { items: await puntosDe(ctx, instalacionId) };
  },
});
