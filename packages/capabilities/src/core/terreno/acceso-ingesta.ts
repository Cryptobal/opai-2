import type { Contexto } from "../../types";
import { evaluarEntradas } from "./acceso-entradas";
import { escribirSalidas, validarSalidas } from "./acceso-salidas";
import type { Equipo, Hecho, Rechazos, Tiempo } from "./acceso-tipos";
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
  const { registros, intentos } = await evaluarEntradas(ctx, equipo, entradas, t, rechazos);
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
