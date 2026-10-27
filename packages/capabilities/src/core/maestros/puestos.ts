import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
// Alcance por filas (#51, ADR-022): la lista filtra con dondePuesto y puestoDe (en puestos-ayuda)
// usa findFirst con el mismo alcance, para que un supervisor fuera de su instalación reciba «no
// encontrado». El resto de la lógica de posición (función, patrón, tramos, horas) es del Brief 11.
import { dondePuesto } from "./alcance";
import { definidos, escribirConEvento } from "./comun";
import { instalacionDe } from "./instalaciones";
import { camposPuesto } from "./puestos-campos";
import {
  cargoActivo,
  componer,
  fechas,
  horasDelCambio,
  incluir,
  mezclarPuesto,
  patronSigueActivo,
  puestoDe,
} from "./puestos-ayuda";
import { puestoSchema, vistaPuesto } from "./puestos-vista";

export const puestosList = defineCapability({
  id: "core.puestos.list",
  descripcion:
    "Puestos (posiciones) de una instalación o de un cargo: función, patrón de turno (p. ej. 4×4), horario por tramos, horas semanales, colación y cobertura PPC. Una fila por posición.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z
    .object({
      instalacionId: uuidSchema.optional(),
      cargoId: uuidSchema.optional().describe("Puestos de este cargo (p. ej. para elegir puesto)."),
      soloActivos: z.boolean().default(false),
    })
    .refine((i) => i.instalacionId || i.cargoId, "Envía instalacionId o cargoId."),
  output: z.array(puestoSchema.extend({ instalacion: z.string() })),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.puesto.findMany({
      where: {
        AND: [dondePuesto(ctx)],
        ...(input.instalacionId ? { instalacionId: input.instalacionId } : {}),
        ...(input.cargoId ? { cargoId: input.cargoId } : {}),
        ...(input.soloActivos ? { estado: "activo" } : {}),
      },
      include: { ...incluir, instalacion: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    });
    return filas.map((f) => ({ ...vistaPuesto(f), instalacion: f.instalacion.nombre }));
  },
});

export const puestosGet = defineCapability({
  id: "core.puestos.get",
  descripcion:
    "Ficha de un puesto (posición): función, patrón de turno, horario por tramos, horas, colación, cobertura y vigencia.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z.object({ id: uuidSchema }),
  output: puestoSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => vistaPuesto(await puestoDe(ctx, input.id)),
});

export const puestosCreate = defineCapability({
  id: "core.puestos.create",
  descripcion:
    "Crea un puesto (1 posición) en una instalación con su función, patrón de turno, horario por tramos (puede cruzar medianoche), horas y colación. Nace en cobertura PPC «Sin asignar».",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ instalacionId: uuidSchema, ...camposPuesto }),
  output: puestoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const i = await instalacionDe(ctx, input.instalacionId);
    if (i.archivadaEn) throw reglaDeNegocio("La instalación está archivada.");
    await cargoActivo(ctx, input.cargoId);
    const { funcion, patron, diasTrabajo, diasDescanso, sugerencia } = await componer(ctx, input);
    const horasSemanales = input.horasSemanales ?? sugerencia;
    const data = definidos({
      ...input,
      ...fechas(input),
      diasTrabajo,
      diasDescanso,
      horasSemanales,
      dotacion: 1,
      estado: "activo",
      cobertura: "ppc",
      coberturaMotivo: "sin_asignar",
    });
    if (dryRun) return vistaPuesto({ ...data, id: "", funcion, patron });
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.puesto.creado", entidadTipo: "puesto" },
      async (tx) => {
        await patronSigueActivo(tx, input.patronId);
        return tx.puesto.create({ data: { ...data, tenantId: ctx.tenantId } });
      },
    );
    return vistaPuesto(await puestoDe(ctx, p.id));
  },
});

export const puestosUpdate = defineCapability({
  id: "core.puestos.update",
  descripcion:
    "Actualiza un puesto (nombre, función, patrón, horario por tramos, horas, colación, vigencia). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ id: uuidSchema, ...z.object(camposPuesto).partial().shape }),
  output: puestoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await puestoDe(ctx, id);
    await cargoActivo(ctx, cambios.cargoId);
    // La función o el patrón se exigen activos solo si cambian (si no, desactivar un catálogo
    // bloquearía editar el nombre o las notas de los puestos que ya lo usan).
    const eligiendoPatronNuevo = cambios.patronId !== undefined && cambios.patronId !== actual.patronId;
    const { funcion, patron, diasTrabajo, diasDescanso, sugerencia } = await componer(
      ctx,
      mezclarPuesto(actual, cambios),
      {
        funcion: cambios.funcionId !== undefined && cambios.funcionId !== actual.funcionId,
        patron: eligiendoPatronNuevo,
      },
    );
    const horasSemanales = horasDelCambio(cambios, actual, sugerencia);
    const data = definidos({ ...cambios, ...fechas(cambios), diasTrabajo, diasDescanso, horasSemanales });
    if (dryRun)
      return vistaPuesto({
        ...actual,
        ...data,
        funcion: cambios.funcionId === undefined ? actual.funcion : funcion,
        patron: cambios.patronId === undefined ? actual.patron : patron,
      });
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.puesto.actualizado", entidadTipo: "puesto" },
      async (tx) => {
        if (eligiendoPatronNuevo) await patronSigueActivo(tx, cambios.patronId);
        return tx.puesto.update({ where: { id }, data });
      },
    );
    return vistaPuesto(await puestoDe(ctx, p.id));
  },
});
