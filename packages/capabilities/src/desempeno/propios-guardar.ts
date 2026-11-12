import { SENTIDOS_INDICADOR, unidadDePropio, vigenciaDelCambio } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { hechosDeLaEmpresa } from "../core/indicadores-gestion/hechos";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import { mesesDe, PERMISOS_DESEMPENO } from "./comun";
import { aDominio, definicionSchema, erroresPara, PREFIJO_PROPIO, propioSchema } from "./propios-comun";
import { previaSchema, vistaPreviaDe } from "./propios-previa";

const DUPLICADO = "Ya existe un indicador propio con ese nombre.";
const entrada = z.object({
  id: uuidSchema.optional().describe("Indicador a cambiar. Sin enviar, crea uno nuevo."),
  nombre: z.string().trim().min(3).max(80),
  descripcion: z.string().trim().max(300).nullable().optional(),
  sentido: z.enum(SENTIDOS_INDICADOR).describe("mayor = más es mejor; menor = menos es mejor."),
  metaSugerida: z
    .number()
    .min(0.0001)
    .max(1_000_000_000_000)
    .transform((v) => Math.round(v * 10_000) / 10_000),
  definicion: definicionSchema,
  publicar: z.boolean().default(false).describe("true lo deja disponible para los scorecards."),
});

export const propiosGuardar = defineCapability({
  id: "desempeno.propios.guardar",
  descripcion:
    "Crea o cambia un indicador propio de la empresa sobre hechos que OPAI ya registra: contar un hecho, sumar un monto, medir el tiempo entre dos hechos o sacar el porcentaje de uno sobre otro. Siempre devuelve una vista previa con los datos reales del mes en curso, para comprobar que el número tiene sentido antes de publicar. Un cambio en un indicador ya publicado rige desde el mes siguiente.",
  permiso: PERMISOS_DESEMPENO.scorecardsManage,
  input: entrada,
  output: z.object({ indicador: propioSchema, vistaPrevia: previaSchema }),
  efecto: "escritura",
  dryRun: true,
  // Publicar cambia con qué se mide a las personas: a un agente le pide aprobación humana (ADR-094 §6).
  exigeAprobacion: (input) => input.publicar,
  describirAprobacion: async (_ctx, input) => `Publicar el indicador propio «${input.nombre}»`,
  async handler(ctx, input, { dryRun }) {
    // La vista previa resume a toda la empresa: no es para quien solo ve una parte (ADR-022).
    if (ctx.alcance !== null) throw prohibido("Con tu alcance no puedes armar indicadores de la empresa.");
    const definicion = aDominio(input.definicion);
    const errores = erroresPara(ctx, definicion, true);
    const unidad = unidadDePropio(definicion, hechosDeLaEmpresa(ctx));
    if (unidad === "porcentaje" && input.metaSugerida > 100) {
      errores.push("El resultado es un porcentaje: la meta no puede pasar de 100.");
    }
    if (errores.length > 0 || !unidad) throw reglaDeNegocio(errores.join(" "), { errores });

    const [meses, todos] = await Promise.all([
      mesesDe(ctx),
      ctx.db.desempenoIndicadorPropio.findMany({ include: { versiones: true } }),
    ]);
    const actual = input.id ? todos.find((p) => p.id === input.id) : undefined;
    if (input.id && !actual) throw noEncontrado("El indicador propio");
    if (actual?.archivadoEn) throw reglaDeNegocio("El indicador está archivado: crea uno nuevo.");
    const nombre = input.nombre.toLowerCase();
    if (todos.some((p) => p.id !== actual?.id && !p.archivadoEn && p.nombre.toLowerCase() === nombre)) {
      throw conflicto(DUPLICADO);
    }
    const publicadas = (actual?.versiones ?? []).filter((v) => v.estado === "publicado");
    const vigencia = (lista: readonly { vigenteDesde: string }[]) =>
      vigenciaDelCambio(lista.map((v) => v.vigenteDesde), meses.actual, meses.siguiente);
    const vigenteDesde = vigencia(publicadas);
    if (!input.publicar && publicadas.some((v) => v.vigenteDesde === vigenteDesde)) {
      throw reglaDeNegocio(
        `Ya hay una versión publicada que rige desde ${vigenteDesde}. Para cambiarla, publica el cambio.`,
      );
    }
    const vistaPrevia = await vistaPreviaDe(ctx, definicion, meses);
    const estado = input.publicar ? ("publicado" as const) : ("borrador" as const);
    const version = { estado, unidad, sentido: input.sentido, metaSugerida: input.metaSugerida };
    const cabecera = { nombre: input.nombre, descripcion: input.descripcion ?? null };
    const vista = (id: string) => ({
      indicador: {
        ...cabecera,
        ...version,
        id,
        indicador: `${PREFIJO_PROPIO}${id}`,
        vigenteDesde,
        archivado: false,
        definicion: input.definicion,
      },
      vistaPrevia,
    });
    if (dryRun) return vista(actual?.id ?? "");
    return ctx.transaccion(async (tx) => {
      // Otra escritura pudo publicar entre la lectura y aquí: si cambió el mes de vigencia, se repite.
      const ahora = actual
        ? await tx.desempenoIndicadorPropioVersion.findMany({
            where: { indicadorId: actual.id, estado: "publicado" },
            select: { vigenteDesde: true },
          })
        : [];
      if (vigencia(ahora) !== vigenteDesde) {
        throw conflicto("Este indicador cambió recién. Vuelve a intentarlo.");
      }
      // El nombre visible de un indicador ya publicado solo cambia al publicar, no con un borrador.
      const tocaCabecera = input.publicar || publicadas.length === 0;
      const fila = !actual
        ? await sinDuplicado(
            tx.desempenoIndicadorPropio.create({ data: { ...cabecera, tenantId: ctx.tenantId } }),
            DUPLICADO,
          )
        : tocaCabecera
          ? await sinDuplicado(
              tx.desempenoIndicadorPropio.update({ where: { id: actual.id }, data: cabecera }),
              DUPLICADO,
            )
          : actual;
      await tx.desempenoIndicadorPropioVersion.deleteMany({
        where: { indicadorId: fila.id, estado: "borrador", vigenteDesde: { not: vigenteDesde } },
      });
      const datos = { ...version, definicion, publicadoEn: input.publicar ? new Date() : null };
      await tx.desempenoIndicadorPropioVersion.upsert({
        where: {
          tenantId_indicadorId_vigenteDesde: { tenantId: ctx.tenantId, indicadorId: fila.id, vigenteDesde },
        },
        create: { ...datos, tenantId: ctx.tenantId, indicadorId: fila.id, vigenteDesde },
        update: datos,
      });
      await ctx.eventos.emitir(tx, {
        tipo: input.publicar ? "desempeno.propio.publicado" : "desempeno.propio.guardado",
        entidadTipo: "indicador_propio",
        entidadId: fila.id,
        payload: { nombre: input.nombre, forma: definicion.forma, vigenteDesde },
      });
      return vista(fila.id);
    });
  },
});
