// Evidencia consultada el 1-nov-2026. Datos de prueba; no autoriza seed ni carga real.
import type { Indicador } from "./indicadores";

type Fuente = { fuente: string; consultadaEl: string; verificacion: "verificado" | "por_verificar" };
const fuente = (url: string, verificado = false): Fuente => ({ fuente: url,
  consultadaEl: "2026-11-01", verificacion: verificado ? "verificado" : "por_verificar" });
export const FUENTES_REFERENCIA: Record<Indicador, Fuente> = {
  uf: fuente("https://www.sii.cl/valores_y_fechas/uf/uf2026.htm", true),
  utm: fuente("https://www.sii.cl/valores_y_fechas/utm/utm2026.htm", true),
  // Monto/vigencia confirmados por DT; falta leer directamente el Diario Oficial.
  imm: fuente("https://www.dt.gob.cl/portal/1628/w3-article-60141.html"),
  // Topes AFP/AFC confirmados por SP; IPS y tope indemnización requieren norma propia en M2.
  topes: fuente("https://www.spensiones.cl/inf_estadistica/cotprev/cotprev.html"),
  afp: fuente("https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9893.html", true),
  // 1,78 % incluido en 3,5 %: SP vigente desde agosto; desglose contrastado con Previred.
  sis: fuente("https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9893.html", true),
  reforma: fuente("https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9893.html", true),
  cesantia: fuente("https://dt.gob.cl/portal/1628/w3-article-95306.html", true),
  mutual: fuente("https://www.suseso.gob.cl/622/w3-article-749903.html"),
  jornada: fuente("https://www.mintrab.gob.cl/40horas-implementacion/", true),
  impuesto: fuente("https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm", true),
};
