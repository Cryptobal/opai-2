// Textos de búsqueda alternativos para el autocompletado. Google responde mejor a «calle número,
// comuna» que a una dirección completa con región y país: si la dirección completa no devuelve
// sugerencias, se prueba sin la región y, por último, solo con la calle.

const ES_REGION = /^(regi[oó]n\b.*|metropolitana|chile)$/i;
const REGION_AL_FINAL = /[\s,]+regi[oó]n\b.*$/i;

/** Variantes ordenadas de más a menos específicas; la primera es el texto escrito, normalizado. */
export function variantesDeBusqueda(texto: string): string[] {
  const limpio = texto.replace(/\s+/g, " ").trim();
  const partes = limpio
    .split(",")
    .map((p) => p.replace(REGION_AL_FINAL, "").trim())
    .filter((p) => p !== "" && !ES_REGION.test(p));
  const candidatas = [
    limpio,
    partes.join(", "),
    partes.slice(0, 2).join(", "),
    partes[0] ?? "",
  ];
  return candidatas.filter((v, i) => v.length >= 3 && candidatas.indexOf(v) === i);
}
