// Slack F2 (CAR-292, ADR-093): vínculo persona de OPAI ↔ usuario de Slack por correo. Solo usuarios
// internos (portal ERP o supervisor) y miembros completos del mismo espacio. Las llamadas a Slack van
// antes de la escritura; la escritura es una sola transacción.
import { clienteSlackUsuarios, ErrorSlack, type UsuarioSlack } from "@opai/integrations";

import type { Contexto } from "../../types";
import { instalacionSlack, tokenSlack } from "./comun";

/** Portales que hacen «interno» a un usuario. Trabajador, terreno y cliente nunca se vinculan (decisión 5). */
export const PORTALES_INTERNOS = ["erp", "supervisor"] as const;
/** Búsquedas por corrida: `users.lookupByEmail` es de nivel 3 en Slack (~50 por minuto). */
export const MAX_POR_CORRIDA = 40;

export const MOTIVOS_SIN_VINCULO = [
  "no_encontrado",
  "invitado",
  "desactivado",
  "bot",
  "otro_espacio",
  "ya_ligado",
  "error",
] as const;
export type MotivoSinVinculo = (typeof MOTIVOS_SIN_VINCULO)[number];

export type Resultado =
  | { userId: string; estado: "vinculado"; slackUserId: string }
  | { userId: string; estado: "sin_vincular"; motivo: MotivoSinVinculo };

export const slackUsuarios = () => clienteSlackUsuarios((url, init) => fetch(url, init));

/** Decide el vínculo de una persona según lo que respondió Slack (sin escribir nada). */
export function decidir(userId: string, u: UsuarioSlack | null, teamId: string): Resultado {
  const sin = (motivo: MotivoSinVinculo): Resultado => ({ userId, estado: "sin_vincular", motivo });
  if (!u) return sin("no_encontrado");
  if (u.teamId !== teamId) return sin("otro_espacio");
  if (u.bot) return sin("bot");
  if (u.eliminado) return sin("desactivado");
  if (u.invitado) return sin("invitado");
  return { userId, estado: "vinculado", slackUserId: u.id };
}

export type Candidato = { userId: string; email: string; nombre: string };

/**
 * Personas internas activas de la empresa, con su correo, en orden de búsqueda: primero las nunca
 * revisadas y luego las revisadas hace más tiempo (así una corrida tras otra avanza por toda la lista).
 * `soloPendientes` saca a las vinculadas; `revisadasAntesDe` saca a las ya revisadas en este ciclo.
 */
export async function candidatos(
  ctx: Contexto,
  o: { usuarioId?: string | undefined; soloPendientes?: boolean; revisadasAntesDe?: Date } = {},
): Promise<Candidato[]> {
  const [miembros, vinculos] = await Promise.all([
    ctx.db.membership.findMany({
      where: { estado: "activa", ...(o.usuarioId ? { userId: o.usuarioId } : {}) },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    ctx.db.slackUsuario.findMany({ select: { userId: true, estado: true, revisadoEn: true } }),
  ]);
  const porId = new Map(vinculos.map((v) => [v.userId, v]));
  const revisado = (userId: string) => porId.get(userId)?.revisadoEn.getTime() ?? 0;
  return miembros
    .filter((m) => m.portales.some((p) => (PORTALES_INTERNOS as readonly string[]).includes(p)))
    .filter((m) => !o.soloPendientes || porId.get(m.userId)?.estado !== "vinculado")
    .filter((m) => !o.revisadasAntesDe || revisado(m.userId) < o.revisadasAntesDe.getTime())
    .sort((a, b) => revisado(a.userId) - revisado(b.userId))
    .map((m) => ({ userId: m.userId, email: m.user.email, nombre: m.user.name }));
}

/** Busca en Slack a cada candidato (hasta `MAX_POR_CORRIDA`). Un error de Slack de una persona no frena al resto. */
export async function buscarEnSlack(ctx: Contexto, lista: Candidato[]) {
  const inst = await instalacionSlack(ctx);
  if (!inst) return { conectada: false as const, resultados: [] as Resultado[], quedan: 0 };
  const token = await tokenSlack(ctx);
  const cliente = slackUsuarios();
  const resultados: Resultado[] = [];
  for (const c of lista.slice(0, MAX_POR_CORRIDA)) {
    try {
      resultados.push(
        decidir(c.userId, await cliente.usuarioPorCorreo(token, c.email), inst.teamId),
      );
    } catch (e) {
      // Token revocado o límite de Slack: se detiene la corrida; el resto queda para la siguiente.
      if (e instanceof ErrorSlack && e.codigo !== "respuesta_invalida") throw e;
      resultados.push({ userId: c.userId, estado: "sin_vincular", motivo: "error" });
    }
  }
  return {
    conectada: true as const,
    resultados,
    quedan: Math.max(0, lista.length - MAX_POR_CORRIDA),
  };
}

/**
 * Guarda los resultados en una transacción. Un usuario de Slack ya ligado a otra persona de la empresa
 * no se reasigna: queda «ya_ligado». También borra los vínculos de quien dejó de ser interno.
 */
export async function guardarVinculos(ctx: Contexto, resultados: Resultado[], ahora = new Date()) {
  const internos = new Set((await candidatos(ctx)).map((c) => c.userId));
  return ctx.transaccion(async (tx) => {
    await tx.slackUsuario.deleteMany({ where: { userId: { notIn: [...internos] } } });
    const finales: Resultado[] = [];
    for (const r0 of resultados) {
      if (!internos.has(r0.userId)) continue;
      let r = r0;
      if (r.estado === "vinculado") {
        const otro = await tx.slackUsuario.findFirst({
          where: { slackUserId: r.slackUserId, userId: { not: r.userId } },
          select: { id: true },
        });
        if (otro) r = { userId: r.userId, estado: "sin_vincular", motivo: "ya_ligado" };
      }
      const datos = {
        estado: r.estado,
        slackUserId: r.estado === "vinculado" ? r.slackUserId : null,
        motivo: r.estado === "sin_vincular" ? r.motivo : null,
        revisadoEn: ahora,
      };
      await tx.slackUsuario.upsert({
        where: { tenantId_userId: { tenantId: ctx.tenantId, userId: r.userId } },
        create: { tenantId: ctx.tenantId, userId: r.userId, ...datos },
        update: datos,
      });
      finales.push(r);
    }
    return finales;
  });
}
