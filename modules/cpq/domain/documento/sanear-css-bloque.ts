import { FUNCIONES_CSS, PROPIEDADES_CSS } from "./html-politicas";

export type ResultadoCssBloque = { css: string; errores: string[] };

const PROHIBIDO_BLOQUE = /(?:@import|@charset|url\s*\(|expression|javascript:|behavior)/i;

/** Sanea el texto de un `<style>`: solo reglas simples, sin red ni directivas activas. */
export function sanearCssBloque(texto: string): ResultadoCssBloque {
  const errores: string[] = [];
  if (PROHIBIDO_BLOQUE.test(texto)) {
    errores.push("El bloque CSS no puede usar @import, url() ni expresiones.");
    return { css: "", errores };
  }
  const sinComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, "");
  const bloques: string[] = [];
  for (const regla of sinComentarios.split("}")) {
    const bruto = regla.trim();
    if (!bruto) continue;
    const i = bruto.indexOf("{");
    if (i <= 0) {
      errores.push("Regla CSS mal formada.");
      continue;
    }
    const selector = bruto.slice(0, i).trim();
    const cuerpo = bruto.slice(i + 1).trim();
    if (!/^[\w#.[\]:,\s\-*>+~|'"]+$/.test(selector) || /[<\\]/.test(selector)) {
      errores.push(`Selector no permitido: ${selector.slice(0, 60)}`);
      continue;
    }
    const decls: string[] = [];
    for (const decl of cuerpo.split(";")) {
      const d = decl.trim();
      if (!d) continue;
      const j = d.indexOf(":");
      if (j <= 0) continue;
      const prop = d.slice(0, j).trim().toLowerCase();
      const valor = d.slice(j + 1).trim();
      if (!PROPIEDADES_CSS.has(prop) && !prop.startsWith("--marca-")) continue;
      if (/[\\{}@<>`"']|javascript:|expression/i.test(valor)) {
        errores.push(`${prop}: valor no permitido en <style>`);
        continue;
      }
      const funciones = [...valor.matchAll(/([a-z-]+)\s*\(/gi)].map((m) => (m[1] ?? "").toLowerCase());
      if (funciones.some((f) => !FUNCIONES_CSS.has(f))) {
        errores.push(`${prop}: función CSS no permitida`);
        continue;
      }
      decls.push(`${prop}: ${valor}`);
    }
    if (decls.length) bloques.push(`${selector}{${decls.join("; ")}}`);
  }
  if (!bloques.length && !errores.length) errores.push("El bloque CSS no tiene reglas permitidas.");
  return { css: bloques.join("\n"), errores };
}