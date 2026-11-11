import { normalizarRut } from "../rut";
import { normalizarTelefono } from "../telefono";
import { claveDeEncabezado } from "./mapeo";
import type { CampoImportable, DefinicionImportador, FilaNormalizada, Mapeo, ProblemaFila, TablaCruda, ValorImportado } from "./tipos";

const VERDADERO = new Set(["si", "s", "x", "1", "true", "verdadero", "yes", "y"]);
const FALSO = new Set(["no", "n", "0", "false", "falso", ""]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fecha civil aaaa-mm-dd desde «2026-03-15», «15-03-2026», «15/03/2026», «15.03.26» o una fecha ISO con hora. */
export function fechaCivil(texto: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(texto);
  const cl = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(texto);
  const [a, m, d] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : cl
      ? [Number(cl[3]) < 100 ? 2000 + Number(cl[3]) : Number(cl[3]), Number(cl[2]), Number(cl[1])]
      : [0, 0, 0];
  if (!a || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCMonth() === m - 1 && f.getUTCDate() === d ? f.toISOString().slice(0, 10) : null;
}

/** Número desde formatos chilenos: «$ 1.200.000», «1200000», «1.200.000,50», «12,5». */
export function numero(texto: string): number | null {
  let t = texto.replace(/[$\s]|clp|uf/gi, "");
  if (!/^-?[\d.,]+$/.test(t)) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type Conversion = { valor: ValorImportado; error?: string };

function convertir(campo: CampoImportable, crudo: string): Conversion {
  const t = crudo.trim();
  if (t === "") return { valor: null };
  const mal = (mensaje: string): Conversion => ({ valor: null, error: mensaje });
  switch (campo.tipo) {
    case "rut":
      return ((r) => (r ? { valor: r } : mal("RUT inválido (revisa el dígito verificador).")))(normalizarRut(t));
    case "email":
      return EMAIL.test(t) && t.length <= 254 ? { valor: t.toLowerCase() } : mal("Correo inválido.");
    case "telefono":
      return ((r) => (r ? { valor: r } : mal("Teléfono inválido.")))(normalizarTelefono(t));
    case "fecha":
      return ((r) => (r ? { valor: r } : mal("Fecha inválida. Usa dd-mm-aaaa o aaaa-mm-dd.")))(fechaCivil(t));
    case "entero":
      return ((n) => (n !== null && Number.isInteger(n) ? { valor: n } : mal("Debe ser un número entero.")))(numero(t));
    case "decimal":
      return ((n) => (n !== null ? { valor: n } : mal("Debe ser un número.")))(numero(t));
    case "booleano": {
      const k = claveDeEncabezado(t);
      return VERDADERO.has(k) ? { valor: true } : FALSO.has(k) ? { valor: false } : mal("Usa «sí» o «no».");
    }
    case "opcion": {
      const k = claveDeEncabezado(t);
      const hallada = Object.entries(campo.opciones ?? {}).find(([clave, nombres]) => [clave, ...nombres].some((n) => claveDeEncabezado(n) === k));
      return hallada ? { valor: hallada[0] } : mal(`Valor no reconocido. Usa uno de: ${Object.keys(campo.opciones ?? {}).join(", ")}.`);
    }
    default:
      return t.length > (campo.largoMaximo ?? 500) ? mal(`Máximo ${campo.largoMaximo ?? 500} caracteres.`) : { valor: t };
  }
}

/** Convierte y valida cada fila según el mapeo. Una fila con errores no frena a las demás. */
export function normalizarFilas(tabla: TablaCruda, def: DefinicionImportador, mapeo: Mapeo): FilaNormalizada[] {
  const indice = new Map(tabla.columnas.map((c, i) => [c, i]));
  const campos = def.campos.map((c) => ({ campo: c, col: tabla.columnas.find((col) => mapeo[col] === c.clave) }));
  return tabla.filas.map((valores, i) => {
    const datos: Record<string, ValorImportado> = {};
    const errores: ProblemaFila[] = [];
    for (const { campo, col } of campos) {
      const r = col === undefined ? { valor: null } : convertir(campo, valores[indice.get(col) ?? -1] ?? "");
      datos[campo.clave] = r.valor;
      if ("error" in r && r.error) errores.push({ campo: campo.clave, mensaje: `${campo.etiqueta}: ${r.error}` });
      else if (campo.requerido && r.valor === null) errores.push({ campo: campo.clave, mensaje: `${campo.etiqueta}: es obligatorio.` });
    }
    return { fila: i + 2, datos, errores };
  });
}
