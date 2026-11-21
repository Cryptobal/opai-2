import type { Contexto } from "../../types";
import { evaluarEntradas } from "./acceso-entradas";
import { escribirSalidas, validarSalidas } from "./acceso-salidas";
import type { Equipo, FilaUso, Hecho, Rechazos, Tiempo } from "./acceso-tipos";
import { TIPOS_HECHO_TERRENO } from "./hechos-tipos";

export type AccesoResuelto = {
  rechazos: Rechazos;
  /** Escribe lo de los hechos aceptados (`aceptadas` = claves que sí se guardaron). */
  escribir: (tx: Contexto["db"], aceptadas: ReadonlySet<string>) => Promise<void>;
};

const entradasDe = (hechos: readonly Hecho[]) =>
  hechos.flatMap((h) => {
    const r =
      h.tipo === "acceso.entrada"
        ? TIPOS_HECHO_TERRENO["acceso.entrada"].safeParse(h.payload)
        : null;
    return r?.success ? [{ h, p: r.data }] : [];
  });
const salidasDe = (hechos: readonly Hecho[]) =>
  hechos.flatMap((h) => {
    const r =
      h.tipo === "acceso.salida" ? TIPOS_HECHO_TERRENO["acceso.salida"].safeParse(h.payload) : null;
    return r?.success ? [{ h, p: r.data }] : [];
  });

/**
 * Usos de prerregistro (CAR-478): solo de los registros que sí quedaron (una entrada reenviada no crea otro) y sin
 * pisar un uso del mismo día que ya exista (la invitación sirve una vez; el par visitante-día es único).
 */
async function escribirUsos(tx: Contexto["db"], usos: FilaUso[]) {
  if (usos.length === 0) return;
  const creados = await tx.registroAcceso.findMany({
    where: { id: { in: usos.map((u) => u.registroId) } },
    select: { id: true },
  });
  const ids = new Set(creados.map((r) => r.id));
  const data = usos.filter((u) => ids.has(u.registroId));
  if (data.length) await tx.prerregistroUso.createMany({ skipDuplicates: true, data });
}

/**
 * Portería (CAR-78 · E4b-2): entrada y salida por la cola. La entrada normaliza el documento, calcula su huella
 * (nunca se guarda el número) y cruza con las listas de la instalación del equipo (el bloqueo gana, R7): si entra
 * queda un registro; si no, un intento denegado. La salida cierra un registro. Todo es solo inserción.
 */
export async function resolverAcceso(
  ctx: Contexto,
  equipo: Equipo,
  hechos: readonly Hecho[],
  t: Tiempo,
): Promise<AccesoResuelto> {
  const rechazos: Rechazos = new Map();
  const vacio: AccesoResuelto = { rechazos, escribir: async () => undefined };
  const entradas = entradasDe(hechos);
  const salidas = salidasDe(hechos);
  if (entradas.length + salidas.length === 0) return vacio;
  if (!ctx.modulosActivos.includes("acceso")) {
    for (const { h } of [...entradas, ...salidas].map(({ h }) => ({ h })))
      rechazos.set(h.clave, "modulo_inactivo");
    return vacio;
  }
  const { registros, intentos, usos } = await evaluarEntradas(ctx, equipo, entradas, t, rechazos);
  const salidasOk = await validarSalidas(
    ctx,
    equipo,
    salidas.map((s) => ({ h: s.h, entradaClave: s.p.entradaClave })),
    new Set(registros.map((r) => r.clave)),
    rechazos,
  );
  return {
    rechazos,
    async escribir(tx, aceptadas) {
      const reg = registros.filter((r) => aceptadas.has(r.clave));
      const int = intentos.filter((r) => aceptadas.has(r.clave));
      if (reg.length) await tx.registroAcceso.createMany({ skipDuplicates: true, data: reg });
      await escribirUsos(
        tx,
        usos.filter((u) => reg.some((r) => r.id === u.registroId)),
      );
      if (int.length) await tx.intentoDenegado.createMany({ skipDuplicates: true, data: int });
      await escribirSalidas(
        tx,
        ctx,
        equipo,
        salidasOk.filter((s) => aceptadas.has(s.h.clave)),
        t,
      );
    },
  };
}
