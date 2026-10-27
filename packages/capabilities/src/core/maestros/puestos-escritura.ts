import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { definidos, escribirConEvento } from "./comun";
import { instalacionDe } from "./instalaciones";
import { camposPuesto } from "./puestos-campos";
import {
  cargoActivo,
  componer,
  fechas,
  horasDelCambio,
  mezclarPuesto,
  puestoDe,
} from "./puestos-ayuda";
import { patronBloqueadoParaHoras } from "./puestos-concurrencia";
import { puestoSchema, vistaPuesto } from "./puestos-vista";

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
        // Releída y bloqueada DENTRO de la transacción (TOCTOU, review 5662449808 punto 1): ver
        // el comentario de `patronBloqueadoParaHoras`.
        const fresco = await patronBloqueadoParaHoras(tx, input.patronId, input);
        const final = fresco
          ? {
              ...data,
              diasTrabajo: fresco.diasTrabajo,
              diasDescanso: fresco.diasDescanso,
              horasSemanales: input.horasSemanales ?? fresco.sugerencia,
            }
          : data;
        return tx.puesto.create({ data: { ...final, tenantId: ctx.tenantId } });
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
    const eligiendoPatronNuevo =
      cambios.patronId !== undefined && cambios.patronId !== actual.patronId;
    const mezclado = mezclarPuesto(actual, cambios);
    const { funcion, patron, diasTrabajo, diasDescanso, sugerencia } = await componer(
      ctx,
      mezclado,
      {
        funcion: cambios.funcionId !== undefined && cambios.funcionId !== actual.funcionId,
        patron: eligiendoPatronNuevo,
      },
    );
    const horasSemanales = horasDelCambio(cambios, actual, sugerencia);
    const data = definidos({
      ...cambios,
      ...fechas(cambios),
      diasTrabajo,
      diasDescanso,
      horasSemanales,
    });
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
        // La lectura autorizada precede al lock; se repite tras él para calcular con la última fila.
        const dentro = { ...ctx, db: tx };
        await puestoDe(dentro, id);
        await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${id}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
        const vigente = await puestoDe(dentro, id);
        const mezcla = mezclarPuesto(vigente, cambios);
        const eligePatron = cambios.patronId !== undefined && cambios.patronId !== vigente.patronId;
        const compuesto = await componer(dentro, mezcla, {
          funcion: cambios.funcionId !== undefined && cambios.funcionId !== vigente.funcionId,
          patron: eligePatron,
        });
        const fresco = eligePatron
          ? await patronBloqueadoParaHoras(tx, cambios.patronId, mezcla)
          : null;
        const final = definidos({
          ...cambios,
          ...fechas(cambios),
          diasTrabajo: fresco?.diasTrabajo ?? compuesto.diasTrabajo,
          diasDescanso: fresco?.diasDescanso ?? compuesto.diasDescanso,
          horasSemanales: horasDelCambio(cambios, vigente, fresco ? fresco.sugerencia : compuesto.sugerencia),
        });
        return tx.puesto.update({ where: { id }, data: final });
      },
    );
    return vistaPuesto(await puestoDe(ctx, p.id));
  },
});
