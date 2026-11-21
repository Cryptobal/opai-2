import { z } from "zod";

import { type Contexto, defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { cursorDe, listaSchema, pagina, uuidSchema } from "./esquemas";
import { avisoSchema, esTrabajador, personaPropia, PORTALES_TERRENO } from "./mensajes-util";

type Aviso = z.infer<typeof avisoSchema>;
type FilaAviso = Omit<Aviso, "tipo"> & { tipo: string };
const vista = (a: FilaAviso): Aviso => ({
  id: a.id,
  tipo: a.tipo as Aviso["tipo"],
  texto: a.texto,
  acuseObligatorio: a.acuseObligatorio,
  plazoMin: a.plazoMin,
  vigenteDesde: a.vigenteDesde,
  vigenteHasta: a.vigenteHasta,
  createdAt: a.createdAt,
});

/** Filtro de destinatarios visibles: el guardia, solo el suyo; un supervisor, los de su alcance (R20). */
async function dondeDestinatarios(ctx: Contexto) {
  if (esTrabajador(ctx)) return { personaId: (await personaPropia(ctx)).id };
  if (!ctx.autorizar("central:alertas.ver")) throw reglaDeNegocio("Ver los avisos exige el permiso central:alertas.ver.");
  return ctx.alcance ? { instalacionId: { in: [...ctx.alcance.instalaciones] } } : {};
}

const itemSchema = avisoSchema.extend({
  destinatarios: z.number().int(),
  acusados: z.number().int(),
  pendienteDeAcuse: z.boolean().describe("Para el guardia: este aviso le pide acuse y aún no lo da."),
});

/** Avisos de la central (R17): el guardia ve los que recibió; la central, los de su alcance con sus acuses. */
export const avisosListar = defineCapability({
  auditarLectura: (s) => s.items.map((a) => a.id),
  id: "central.avisos.listar",
  descripcion:
    "Lista los avisos de la central del más nuevo al más antiguo, con cuántas personas lo recibieron y cuántas acusaron. El guardia ve solo los que le llegaron, con los pendientes de acuse marcados.",
  permiso: null,
  portales: PORTALES_TERRENO,
  input: listaSchema.extend({ vigentes: z.boolean().default(false).describe("Solo los avisos vigentes hoy.") }),
  output: z.object({ items: z.array(itemSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const dest = await dondeDestinatarios(ctx);
    const ahora = new Date();
    const filas = await ctx.db.centralAviso.findMany({
      where: {
        destinatarios: { some: dest },
        ...(i.vigentes ? { AND: [{ OR: [{ vigenteDesde: null }, { vigenteDesde: { lte: ahora } }] }, { OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: ahora } }] }] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...cursorDe(i.cursor, i.limite),
    });
    const p = pagina(filas, i.limite, i.cursor);
    const ids = p.items.map((a) => a.id);
    const [destinos, acuses] = await Promise.all([
      ctx.db.centralAvisoDestinatario.findMany({ where: { avisoId: { in: ids }, ...dest }, select: { avisoId: true, personaId: true } }),
      ctx.db.centralAcuse.findMany({ where: { avisoId: { in: ids } }, select: { avisoId: true, personaId: true } }),
    ]);
    const visibles = new Set(destinos.map((d) => `${d.avisoId}:${d.personaId}`));
    const items = p.items.map((a) => {
      const total = destinos.filter((d) => d.avisoId === a.id).length;
      const acusados = acuses.filter((x) => x.avisoId === a.id && visibles.has(`${x.avisoId}:${x.personaId}`)).length;
      return { ...vista(a), destinatarios: total, acusados, pendienteDeAcuse: esTrabajador(ctx) && a.acuseObligatorio && acusados === 0 };
    });
    return { items, siguiente: p.siguiente };
  },
});

const destinatarioSchema = z.object({
  personaId: uuidSchema,
  instalacionId: uuidSchema.nullable(),
  venceEn: z.date().nullable(),
  acusadoEn: z.date().nullable(),
  tarde: z.boolean(),
  alertaId: uuidSchema.nullable(),
});

/** Un aviso con sus destinatarios visibles y el estado de cada acuse (R17). */
export const avisosObtener = defineCapability({
  auditarLectura: (s) => [s.aviso.id, ...s.destinatarios.map((d) => d.personaId)],
  id: "central.avisos.obtener",
  descripcion: "Obtiene un aviso de la central con sus destinatarios y, por cada uno, si acusó, a qué hora, si fue tarde y si su falta de acuse abrió una alerta.",
  permiso: null,
  portales: PORTALES_TERRENO,
  input: z.object({ id: uuidSchema }),
  output: z.object({ aviso: avisoSchema, destinatarios: z.array(destinatarioSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const dest = await dondeDestinatarios(ctx);
    const destinos = await ctx.db.centralAvisoDestinatario.findMany({ where: { avisoId: i.id, ...dest }, take: 500 });
    if (destinos.length === 0) throw noEncontrado("El aviso");
    const a = await ctx.db.centralAviso.findFirst({ where: { id: i.id } });
    if (!a) throw noEncontrado("El aviso");
    const acuses = await ctx.db.centralAcuse.findMany({ where: { avisoId: a.id, personaId: { in: destinos.map((d) => d.personaId) } } });
    const porPersona = new Map(acuses.map((x) => [x.personaId, x]));
    return {
      aviso: vista(a),
      destinatarios: destinos.map((d) => ({
        personaId: d.personaId,
        instalacionId: d.instalacionId,
        venceEn: d.venceEn,
        acusadoEn: porPersona.get(d.personaId)?.createdAt ?? null,
        tarde: porPersona.get(d.personaId)?.tarde ?? false,
        alertaId: d.alertaId,
      })),
    };
  },
});
