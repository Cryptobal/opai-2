// `additionalReferences` de las plantillas recurrentes de 1.0 (Json?). Nunca detiene el dryRun: lo ilegible
// o incompleto se descarta y queda como advertencia (plantilla y campo, sin valores).
import type { Advertencia } from "./origen-tolerante";

type Fila = Record<string, unknown>;
const esFila = (v: unknown): v is Fila => typeof v === "object" && v !== null && !Array.isArray(v);
const textoRef = (v: unknown): string =>
  typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
const MAX_TEXTO = 100_000;

/** null, texto JSON, objeto suelto o arreglo → arreglo de objetos; lo ilegible se descarta con advertencia. */
export function referenciasComoArreglo(id: string, v: unknown, avisos: Advertencia[]): Fila[] {
  const aviso = (codigo: string) =>
    avisos.push({ codigo, recurso: "recurrentes", idOpai1: id, campo: "additionalReferences" });
  let valor = v;
  if (typeof valor === "string") {
    try {
      if (valor.length > MAX_TEXTO) throw new Error("texto demasiado largo");
      valor = JSON.parse(valor);
    } catch {
      aviso("campo_vaciado");
      return [];
    }
  }
  if (valor == null) return [];
  const lista: unknown[] = Array.isArray(valor) ? valor : [valor];
  const filas = lista.filter(esFila);
  if (filas.length < lista.length) aviso("elemento_descartado");
  return filas;
}

/** Sin folio ni fecha se descarta; a medias (falta folio, fecha o tipo) se omite; la completa se normaliza. */
export function limpiarReferencias(id: string, v: unknown, avisos: Advertencia[]): Fila[] {
  const salida: Fila[] = [];
  for (const r of referenciasComoArreglo(id, v, avisos)) {
    const fchRef = textoRef(r["fchRef"]);
    const folioRef = textoRef(r["folioRef"]);
    const tipoDocRef = textoRef(r["tipoDocRef"]);
    const falta = !fchRef ? "fchRef" : !folioRef ? "folioRef" : !tipoDocRef ? "tipoDocRef" : null;
    if (!fchRef && !folioRef) {
      avisos.push({
        codigo: "elemento_descartado",
        recurso: "recurrentes",
        idOpai1: id,
        campo: "additionalReferences.vacia",
      });
    } else if (falta) {
      avisos.push({
        codigo: "elemento_descartado",
        recurso: "recurrentes",
        idOpai1: id,
        campo: `additionalReferences.${falta}`,
      });
    } else {
      const razonRef = textoRef(r["razonRef"]);
      salida.push({ fchRef, folioRef, tipoDocRef, ...(razonRef ? { razonRef } : {}) });
    }
  }
  return salida;
}
