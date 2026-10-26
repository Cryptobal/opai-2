import type { Contexto } from "../../types";

export type Destinatario = { id: string; email: string };

/**
 * Usuarios activos del tenant con alguno de los roles o listados explícitamente en la regla. Si el
 * evento es de un documento, el aviso llega solo a los supervisores que lo tienen en su alcance
 * (ADR-022): `supervisoresPermitidos` es el conjunto de supervisores con el documento a cargo; una
 * membresía de supervisor que no esté ahí se descarta, salvo que el usuario figure explícito en la
 * regla o tenga además otro rol que sí lo incluya. Si es null, no se acota (evento no documental).
 */
export async function destinatarios(
  ctx: Contexto,
  roles: string[],
  usuarios: string[],
  supervisoresPermitidos: Set<string> | null,
): Promise<Destinatario[]> {
  const m = await ctx.db.membership.findMany({
    where: { estado: "activa", OR: [{ rol: { in: roles } }, { userId: { in: usuarios } }] },
    select: { userId: true, rol: true },
  });
  const explicitos = new Set(usuarios);
  const ids = [
    ...new Set(
      m
        .filter(
          (x) =>
            !supervisoresPermitidos ||
            x.rol !== "supervisor" ||
            explicitos.has(x.userId) ||
            supervisoresPermitidos.has(x.userId),
        )
        .map((x) => x.userId),
    ),
  ];
  return ids.length
    ? ctx.db.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } })
    : [];
}

/** Usuarios que silenciaron los avisos (ajuste `preferencias_silencio` por usuario). */
export async function silenciados(ctx: Contexto, ids: string[]): Promise<Set<string>> {
  const filas = await ctx.db.ajuste.findMany({
    where: { ambito: "usuario", sujetoId: { in: ids }, modulo: "core", clave: "preferencias_silencio" },
  });
  return new Set(filas.filter((f) => f.valor === true).map((f) => f.sujetoId));
}
