/**
 * Formato de las novedades (CAR-316) y del chat del agente (CAR-525): Markdown sencillo sin HTML.
 * Párrafos, listas, títulos, tablas GFM, **negrita**, *cursiva*, `código` y enlaces internos o https.
 */
export type { BloqueNovedad, TrozoNovedad } from "./tipos-novedad";
export { bloquesNovedad } from "./bloques";
export { hrefSeguroNovedad, textoPlanoNovedad, trozosNovedad } from "./trozos";
