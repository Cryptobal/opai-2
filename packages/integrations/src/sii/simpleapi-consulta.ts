import type { ConsultaSiiResultado } from "./tipos";

/** Respuesta de POST /api/v1/consulta/envio (ejemplos «Consulta Exitosa» de la documentación). */
export type RespuestaConsultaEnvio = {
  estados?: { cantidadInformados?: number; cantidadAceptados?: number; cantidadRechazados?: number; cantidadReparos?: number }[];
  responseXml?: string;
}

/** Códigos del SII que la documentación lista para un envío (`<ESTADO>` del encabezado de la respuesta). */
/** Error en schema (RSC), en firma (RFR) o en carátula (RCT). Los demás códigos de envío (SOK, CRT, FOK, PDR) son «en proceso». */
const RECHAZADOS = new Set(["RSC", "RFR", "RCT"]);

const campo = (xml: string, nombre: string) => new RegExp(`<${nombre}>([^<]*)</${nombre}>`).exec(xml)?.[1]?.trim();

/**
 * EPR (envío procesado) no dice si el documento se aceptó: eso lo dan los contadores. Aceptado solo si ninguno se
 * rechazó ni quedó con reparos; cualquier código desconocido se trata como pendiente, nunca como aceptado.
 */
export function mapearConsultaEnvio(data: RespuestaConsultaEnvio): ConsultaSiiResultado {
  const xml = data.responseXml ?? "";
  const codigo = campo(xml, "ESTADO")?.toUpperCase() ?? "";
  const glosa = campo(xml, "GLOSA");
  const con = (estado: ConsultaSiiResultado["estado"]): ConsultaSiiResultado => ({ estado, ...(glosa ? { glosa } : {}) });
  if (RECHAZADOS.has(codigo)) return con("rechazado");
  if (codigo !== "EPR") return con("pendiente");
  const t = (data.estados ?? []).reduce(
    (a, e) => ({
      informados: a.informados + (e.cantidadInformados ?? 0),
      aceptados: a.aceptados + (e.cantidadAceptados ?? 0),
      rechazados: a.rechazados + (e.cantidadRechazados ?? 0),
      reparos: a.reparos + (e.cantidadReparos ?? 0),
    }),
    { informados: 0, aceptados: 0, rechazados: 0, reparos: 0 },
  );
  if (t.rechazados > 0) return con("rechazado");
  if (t.reparos > 0) return con("reparo");
  if (t.informados > 0 && t.aceptados === t.informados) return con("aceptado");
  return con("pendiente");
}
