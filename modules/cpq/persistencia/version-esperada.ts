import { conflicto, type Contexto } from "@opai/capabilities";

/**
 * Versión que el envío validó al inicio (CAR-192). Viaja hasta el `updateMany` que la marca enviada:
 * exige el mismo estado y la misma huella, así que reabrir (lista → borrador), reabrir → editar →
 * volver a marcar lista, o editar un puesto mientras se arma el PDF terminan en conflicto y no dejan
 * nada enviado. Las ediciones de líneas no incrementan `revision`, así que la huella suma `revision`
 * (que sube al reabrir) y las marcas de tiempo de la versión, sus secciones y sus líneas, y cuántas hay.
 */
export type VersionEsperada = { estado: string; huella: string };

type Lector = Pick<Contexto["db"], "cpqVersion" | "cpqSeccion" | "cpqLinea">;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : "-");
const maximo = (filas: readonly { updatedAt: Date }[]) =>
  filas.reduce<Date | null>((m, f) => (!m || f.updatedAt > m ? f.updatedAt : m), null);

export async function leerVersionEsperada(db: Lector, versionId: string): Promise<VersionEsperada | null> {
  const v = await db.cpqVersion.findFirst({ where: { id: versionId }, select: { estado: true, revision: true, updatedAt: true } });
  if (!v) return null;
  const secciones = await db.cpqSeccion.findMany({ where: { versionId }, select: { id: true, updatedAt: true } });
  const lineas = secciones.length
    ? await db.cpqLinea.findMany({
        where: { seccionId: { in: secciones.map((s) => s.id) } },
        select: { updatedAt: true },
      })
    : [];
  const huella = [
    `r${v.revision}`,
    iso(v.updatedAt),
    `${secciones.length}:${iso(maximo(secciones))}`,
    `${lineas.length}:${iso(maximo(lineas))}`,
  ].join("|");
  return { estado: v.estado, huella };
}

/** Falla con conflicto si la versión ya no es la que se validó; se llama dentro de la transacción del envío. */
export async function exigirVersionEsperada(db: Lector, versionId: string, esperada: VersionEsperada) {
  const actual = await leerVersionEsperada(db, versionId);
  if (!actual || actual.estado !== esperada.estado || actual.huella !== esperada.huella)
    throw conflicto("La cotización cambió mientras se preparaba el envío; vuelve a cargar la ficha.");
}
