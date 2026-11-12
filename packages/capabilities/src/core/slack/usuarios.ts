import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio } from "../../errores";
import { iso } from "../comun";
import { errorDeSlack, instalacionSlack } from "./comun";
import {
  buscarEnSlack,
  candidatos,
  guardarVinculos,
  MAX_POR_CORRIDA,
  MOTIVOS_SIN_VINCULO,
  type Resultado,
} from "./vinculo";
import { encolarVincular } from "./vinculo-trabajos";

const filaSchema = z.object({
  usuarioId: z.uuid(),
  nombre: z.string(),
  email: z.string(),
  /** «pendiente»: todavía no se buscó en Slack. */
  estado: z.enum(["vinculado", "sin_vincular", "pendiente"]),
  motivo: z.enum(MOTIVOS_SIN_VINCULO).nullable(),
  revisadoEn: z.string().nullable(),
});

export const slackUsuariosList = defineCapability({
  // Lectura de personas (NÚCLEO-H): se auditan los ids revelados, sin nombres ni correos.
  auditarLectura: (s) => s.personas.map((p) => p.usuarioId),
  id: "core.slack.usuarios",
  descripcion:
    "Lista las personas internas de la empresa (con acceso al ERP o al portal de supervisor) y si quedaron vinculadas a su usuario de Slack por su correo, con el motivo cuando no. Los guardias no se vinculan.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({}),
  output: z.object({ conectada: z.boolean(), personas: z.array(filaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    if (ctx.alcance) throw prohibido("No tienes acceso al directorio de usuarios.");
    const [inst, lista, vinculos] = await Promise.all([
      instalacionSlack(ctx),
      candidatos(ctx),
      ctx.db.slackUsuario.findMany({}),
    ]);
    if (!inst) return { conectada: false, personas: [] };
    const porId = new Map(vinculos.map((v) => [v.userId, v]));
    const personas = lista.map((u) => {
      const v = porId.get(u.userId);
      return {
        usuarioId: u.userId,
        nombre: u.nombre,
        email: u.email,
        estado: (v?.estado ?? "pendiente") as "vinculado" | "sin_vincular" | "pendiente",
        motivo: (v?.motivo ?? null) as (typeof MOTIVOS_SIN_VINCULO)[number] | null,
        revisadoEn: iso(v?.revisadoEn),
      };
    });
    const orden = { sin_vincular: 0, pendiente: 1, vinculado: 2 } as const;
    personas.sort(
      (a, b) => orden[a.estado] - orden[b.estado] || a.nombre.localeCompare(b.nombre, "es"),
    );
    return { conectada: true, personas };
  },
});

export const slackVincularUsuarios = defineCapability({
  id: "core.slack.vincular_usuarios",
  descripcion:
    "Busca ahora en Slack, por su correo, a las personas internas de la empresa y las vincula con su usuario de Slack (solo miembros completos del mismo espacio; nunca invitados ni guardias). Sin usuarioId revisa a todas, hasta 40 por vez. La vista previa no llama a Slack: dice a cuántas buscaría. Un correo que no está en Slack queda «sin vincular».",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({ usuarioId: z.uuid().optional() }),
  output: z.object({
    /** Personas buscadas en esta corrida (en la vista previa: las que se buscarían; no llama a Slack). */
    buscadas: z.number().int(),
    vinculadas: z.number().int(),
    sinVincular: z.number().int(),
    quedan: z.number().int(),
  }),
  efecto: "escritura",
  dryRun: true,
  // Las búsquedas en Slack son llamadas remotas: van antes de la transacción de la escritura.
  async preparar(ctx, input) {
    if (!(await instalacionSlack(ctx))) throw reglaDeNegocio("Slack no está conectado.");
    const lista = await candidatos(ctx, { usuarioId: input.usuarioId });
    if (input.usuarioId && !lista.length)
      throw reglaDeNegocio("Esa persona no es un usuario interno activo de la empresa.");
    const inicio = new Date().toISOString();
    try {
      return { ...(await buscarEnSlack(ctx, lista)), inicio };
    } catch (e) {
      throw errorDeSlack(e);
    }
  },
  async handler(ctx, input, { dryRun, preparado }) {
    if (dryRun) {
      // La vista previa no llama a Slack: dice a cuántas personas buscaría.
      if (!(await instalacionSlack(ctx))) throw reglaDeNegocio("Slack no está conectado.");
      const n = (await candidatos(ctx, { usuarioId: input.usuarioId })).length;
      if (input.usuarioId && !n)
        throw reglaDeNegocio("Esa persona no es un usuario interno activo de la empresa.");
      const buscadas = Math.min(n, MAX_POR_CORRIDA);
      return { buscadas, vinculadas: 0, sinVincular: 0, quedan: n - buscadas };
    }
    const p = preparado as { resultados: Resultado[]; quedan: number; inicio: string } | undefined;
    if (!p) throw reglaDeNegocio("No se pudo consultar Slack. Intenta de nuevo.");
    const finales = await guardarVinculos(ctx, p.resultados);
    // Más de 40: el resto lo busca el trabajo en un minuto (solo quienes no se revisaron ahora).
    if (p.quedan > 0)
      await ctx.transaccion((tx) =>
        encolarVincular(ctx, tx, "", {
          continuacion: { desde: p.inicio, vuelta: 1 },
        }),
      );
    const vinculadas = finales.filter((r) => r.estado === "vinculado").length;
    return {
      buscadas: p.resultados.length,
      vinculadas,
      sinVincular: finales.length - vinculadas,
      quedan: p.quedan,
    };
  },
});
