import { noEncontrado, reglaDeNegocio } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";
import { emparejarMovimientos } from "@opai/domain";

import { TOLERANCIA_DIAS } from "./cartola-emparejar";
import { copiasDe } from "./descartes-copia";
import { aFecha, aIso } from "./util";

type Db = Pick<TenantTx, "movimientoBancario" | "movimientoBancarioDescarte">;
const sumarDias = (iso: string, n: number) => aFecha(aIso(new Date(aFecha(iso).getTime() + n * 86_400_000)));

/**
 * CAR-412: qué movimientos de un descarte vuelven a la cuenta. Omite los que ya están de vuelta: por el mismo id,
 * clave o id externo, o porque una cartola o la sincronización los trajo con otra huella. Para eso se cruzan con el
 * mismo emparejador de las cartolas (monto, referencia, glosa y fecha ± la tolerancia de días). `reclamado`: el
 * descarte ya quedó marcado como restaurado en esta misma transacción.
 */
export async function planRestaurar(db: Db, descarteId: string, reclamado = false) {
  const d = await db.movimientoBancarioDescarte.findFirst({ where: { id: descarteId } });
  if (!d) throw noEncontrado("El descarte");
  if (d.restauradoEn && !reclamado) throw reglaDeNegocio("Este descarte ya se restauró.");
  const copias = copiasDe(d.movimientos);
  const fechas = copias.map((c) => aIso(c.fecha)).sort();
  const vivos = fechas.length
    ? await db.movimientoBancario.findMany({
        where: {
          cuentaId: d.cuentaId,
          OR: [
            { fecha: { gte: sumarDias(fechas[0]!, -TOLERANCIA_DIAS), lte: sumarDias(fechas.at(-1)!, TOLERANCIA_DIAS) } },
            { id: { in: copias.map((c) => c.id) } },
            { claveDedupe: { in: copias.map((c) => c.claveDedupe) } },
            { idExterno: { in: copias.flatMap((c) => (c.idExterno ? [c.idExterno] : [])) } },
          ],
        },
        select: { id: true, fecha: true, monto: true, glosa: true, referencia: true, claveDedupe: true, idExterno: true },
      })
    : [];
  // Un vivo que ya representa una copia exacta no puede representar otra por parecido.
  const usados = new Set<string>();
  const candidatos = copias.filter((c) => {
    const exactos = vivos.filter((v) =>
      v.id === c.id || v.claveDedupe === c.claveDedupe || (c.idExterno !== null && v.idExterno === c.idExterno));
    const exacto = exactos[0];
    if (exactos.length > 1 || (exacto && usados.has(exacto.id))) {
      throw reglaDeNegocio("No se puede restaurar: hay movimientos con identificadores contradictorios. Revisa los movimientos de la cuenta; el descarte se conserva.");
    }
    if (!exacto) return true;
    usados.add(exacto.id);
    return false;
  });
  const pares = emparejarMovimientos(
    candidatos.map((c) => ({ fecha: aIso(c.fecha), monto: Number(c.monto), glosa: c.glosa, referencia: c.referencia })),
    vivos.filter((v) => !usados.has(v.id)).map((v) => ({ id: v.id, fecha: aIso(v.fecha), monto: Number(v.monto), glosa: v.glosa, referencia: v.referencia })),
    { toleranciaDias: TOLERANCIA_DIAS },
  );
  const nuevos = candidatos.filter((_, i) => !pares.has(i));
  return { d, nuevos, yaPresentes: copias.length - nuevos.length };
}
