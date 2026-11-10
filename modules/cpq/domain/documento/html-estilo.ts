import { FUNCIONES_CSS, PROPIEDADES_CSS } from "./html-politicas";

export type ResultadoEstilo = { css: string; quitadas: string[]; errores: string[] };

/** Caracteres que no tienen cabida en un valor CSS de una plantilla: escapes, llaves, comillas, `@`, `<`, `>`. */
const PROHIBIDO = /[\\{}@<>`"']|\/\*|\*\//;

/**
 * Sanea el atributo `style`: solo propiedades de la lista blanca, solo funciones CSS permitidas, sin escapes ni
 * recursos (`url(...)` es un error, no un descarte, porque indica una carga de red).
 */
export function sanearEstilo(texto: string): ResultadoEstilo {
  const salida: ResultadoEstilo = { css: "", quitadas: [], errores: [] };
  const partes: string[] = [];
  for (const decl of texto.split(";")) {
    const bruto = decl.trim();
    if (!bruto) continue;
    const i = bruto.indexOf(":");
    if (i <= 0) {
      salida.quitadas.push(bruto);
      continue;
    }
    const prop = bruto.slice(0, i).trim().toLowerCase();
    const valor = bruto.slice(i + 1).trim().replace(/\s*!important\s*$/i, "");
    if (!PROPIEDADES_CSS.has(prop) && !prop.startsWith("--ds-")) {
      salida.quitadas.push(prop);
      continue;
    }
    if (PROHIBIDO.test(valor) || (prop.startsWith("--") && !/^[a-z0-9 .,%#()\-+/]*$/i.test(valor))) {
      salida.errores.push(`${prop}: valor no permitido`);
      continue;
    }
    const funciones = [...valor.matchAll(/([a-z-]+)\s*\(/gi)].map((m) => (m[1] ?? "").toLowerCase());
    const mala = funciones.find((f) => !FUNCIONES_CSS.has(f));
    if (mala) {
      salida.errores.push(`${prop}: la función «${mala}(» no está permitida`);
      continue;
    }
    if (/javascript:|expression|behavior|-moz-binding|@import/i.test(valor)) {
      salida.errores.push(`${prop}: valor no permitido`);
      continue;
    }
    partes.push(`${prop}: ${valor}`);
  }
  salida.css = partes.join("; ");
  return salida;
}
