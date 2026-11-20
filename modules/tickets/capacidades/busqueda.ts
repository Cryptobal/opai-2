import type { Contexto } from "@opai/capabilities";

const MIN = 2;

function limiteUuid(prefijo: string, relleno: "0" | "f"): string {
  const hex = prefijo.padEnd(32, relleno);
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

/** Filtro por texto: asunto, solicitante (nombre) y prefijo del número (UUID). */
export async function dondeTexto(ctx: Contexto, q: string | undefined): Promise<object> {
  const term = q?.trim() ?? "";
  if (term.length < MIN) return {};
  const solicitantes = (
    await ctx.db.user.findMany({
      where: {
        name: { contains: term, mode: "insensitive" },
        memberships: { some: { tenantId: ctx.tenantId } },
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 50,
    })
  ).map((u) => u.id);
  const or: object[] = [{ titulo: { contains: term, mode: "insensitive" } }];
  if (solicitantes.length) or.push({ solicitanteId: { in: solicitantes } });
  const hex = term.replace(/-/g, "").toLowerCase();
  if (/^[0-9a-f]{4,32}$/.test(hex)) {
    const prefijo = hex.slice(0, 8);
    // El id es UUID nativo: un intervalo indexable evita LIKE sobre UUID.
    or.push({ id: { gte: limiteUuid(prefijo, "0"), lte: limiteUuid(prefijo, "f") } });
  }
  return { OR: or };
}
