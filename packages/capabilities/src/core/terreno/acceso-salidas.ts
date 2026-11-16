import type { Contexto } from "../../types";
import type { Equipo, FilaSalida, Hecho, Rechazos, Tiempo } from "./acceso-tipos";

type Salida = { h: Hecho; entradaClave: string };

/** Valida cada salida: su entrada existe (guardada o aceptada en este lote) y no tiene otra salida. */
export async function validarSalidas(
  ctx: Contexto,
  equipo: Equipo,
  salidas: readonly Salida[],
  aceptadasEnLote: ReadonlySet<string>,
  rechazos: Rechazos,
): Promise<Salida[]> {
  if (salidas.length === 0) return [];
  const previas = await ctx.db.registroAcceso.findMany({
    where: {
      instalacionId: equipo.instalacionId,
      clave: { in: salidas.map((s) => s.entradaClave) },
    },
    select: { clave: true, salida: { select: { id: true } }, anulacion: { select: { id: true } } },
  });
  const existentes = new Map(previas.map((r) => [r.clave, r.salida !== null]));
  // Un registro anulado desde el ERP (CAR-477) no admite salida, tampoco la que llega tarde sin conexión.
  const anuladas = new Set(previas.filter((r) => r.anulacion !== null).map((r) => r.clave));
  const usadas = new Set<string>();
  return salidas.filter((s) => {
    const k = s.entradaClave;
    if (!existentes.has(k) && !aceptadasEnLote.has(k))
      rechazos.set(s.h.clave, "entrada_desconocida");
    else if (anuladas.has(k)) rechazos.set(s.h.clave, "entrada_anulada");
    else if (existentes.get(k) === true || usadas.has(k))
      rechazos.set(s.h.clave, "salida_repetida");
    else {
      usadas.add(k);
      return true;
    }
    return false;
  });
}

/** Inserta las salidas aceptadas atándolas al registro de su entrada. */
export async function escribirSalidas(
  tx: Contexto["db"],
  ctx: Contexto,
  equipo: Equipo,
  salidas: readonly Salida[],
  t: Tiempo,
): Promise<void> {
  if (salidas.length === 0) return;
  const ids = await tx.registroAcceso.findMany({
    where: {
      instalacionId: equipo.instalacionId,
      clave: { in: salidas.map((s) => s.entradaClave) },
    },
    select: { id: true, clave: true },
  });
  const porClave = new Map(ids.map((r) => [r.clave, r.id]));
  const data = salidas.flatMap((s): FilaSalida[] => {
    const registroId = porClave.get(s.entradaClave);
    if (!registroId) return [];
    return [
      {
        tenantId: ctx.tenantId,
        instalacionId: equipo.instalacionId,
        dispositivoId: equipo.id,
        registroId,
        clave: s.h.clave,
        personaId: s.h.personaId ?? null,
        horaCorregida: t.corregir(new Date(s.h.horaHecho)),
      },
    ];
  });
  await tx.salidaAcceso.createMany({ skipDuplicates: true, data });
}
