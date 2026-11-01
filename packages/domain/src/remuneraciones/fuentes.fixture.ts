// Evidencia consultada el 1-nov-2026. Datos de prueba; no autoriza seed ni carga real.
import type { Indicador } from "./indicadores";

type Fuente = { fuente: string; consultadaEl: string; verificacion: "verificado" | "por_verificar" };
const fuente = (url: string, verificado = false): Fuente => ({ fuente: url,
  consultadaEl: "2026-11-01", verificacion: verificado ? "verificado" : "por_verificar" });
export const FUENTES_REFERENCIA: Record<Indicador, Fuente> = {
  uf: fuente("https://www.sii.cl/valores_y_fechas/uf/uf2026.htm", true),
  utm: fuente("https://www.sii.cl/valores_y_fechas/utm/utm2026.htm", true),
  // Ley 21.830 art. 1 (BCN idNorma 1225354, DO 22-jun-2026); DT confirma vigencia 1-may-2026.
  imm: fuente("https://www.bcn.cl/leychile/Navegar?idNorma=1225354", true),
  // SP feb-2026: 90 UF previsional/salud/16.744 y 135,2 UF cesantía; tope indemnización 90 UF art. 172 CT (BCN idNorma 207436).
  topes: fuente("https://www71.spensiones.cl/portal/institucional/594/articles-16921_recurso_1.pdf", true),
  afp: fuente("https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9893.html", true),
  sis: fuente("https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9893.html", true),
  reforma: fuente("https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9893.html", true),
  cesantia: fuente("https://dt.gob.cl/portal/1628/w3-article-95306.html", true),
  // Básica 0,90 % (SUSESO); SANNA 0,03 % (ISL). Adicional mutual por resolución: hipótesis en fixtures, no verificada.
  mutual: fuente("https://www.suseso.gob.cl/606/w3-article-18613.html", true),
  jornada: fuente("https://www.mintrab.gob.cl/40horas-implementacion/", true),
  impuesto: fuente("https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm", true),
};
