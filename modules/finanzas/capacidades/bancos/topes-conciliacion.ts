import { reglaDeNegocio } from "@opai/capabilities";

type Agregador = {
  conciliacionBanco: {
    aggregate(args: {
      where: { enlaceId: string; tipoEnlace: string; activa: boolean; confirmada: boolean };
      _sum: { monto: true };
    }): Promise<{ _sum: { monto: bigint | null } }>;
  };
};

/** Un mismo documento no puede aparecer dos veces en una conciliación (se suman en un solo enlace). */
export function exigirEnlacesDistintos(enlaces: { tipo: string; id: string }[]): void {
  const vistos = new Set<string>();
  for (const e of enlaces) {
    const clave = `${e.tipo}:${e.id}`;
    if (vistos.has(clave)) throw reglaDeNegocio("Un documento solo puede estar una vez en la conciliación.");
    vistos.add(clave);
  }
}

/** El monto conciliado de un documento nunca supera su total: lo ya conciliado + lo nuevo ≤ total. */
export async function exigirTopeDocumento(
  db: Agregador,
  tipo: "documento_emitido" | "documento_recibido",
  documentoId: string,
  montoTotal: number,
  monto: number,
): Promise<void> {
  const previo = await db.conciliacionBanco.aggregate({
    where: { enlaceId: documentoId, tipoEnlace: tipo, activa: true, confirmada: true },
    _sum: { monto: true },
  });
  const pendiente = montoTotal - Number(previo._sum.monto ?? 0n);
  if (monto > pendiente) {
    throw reglaDeNegocio(`El monto supera lo pendiente del documento (${Math.max(pendiente, 0)}).`);
  }
}
