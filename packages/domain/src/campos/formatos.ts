import { formatearClp, formatearFecha, formatearFechaHora, formatearNumero } from "../formato";
import type { TipoCampo, ValorCampo } from "./tipos";

/** Formatos admitidos por tipo; el primero es el predeterminado cuando el token no indica ninguno. */
export const FORMATOS_POR_TIPO: Readonly<Record<TipoCampo, readonly string[]>> = {
  texto: ["texto", "mayusculas", "minusculas", "capitalizar"],
  clp: ["clp", "numero"],
  numero: ["numero", "entero"],
  fecha: ["fecha", "fecha_hora"],
  booleano: ["si_no"],
  url: ["url"],
};

export function formatoValido(tipo: TipoCampo, formato: string | undefined): boolean {
  return formato === undefined || FORMATOS_POR_TIPO[tipo].includes(formato);
}

export function estaVacio(v: ValorCampo): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

/** `http` o `https` y nada más: sin `javascript:`, `data:` ni rutas relativas. */
export function urlSegura(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function aFecha(v: ValorCampo): Date | string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v !== "string") return null;
  return Number.isNaN(new Date(v).getTime()) ? null : v;
}

/** Presenta un valor ya presente con el formateador único (R4). `null` si el valor no sirve para el tipo. */
export function formatearValor(tipo: TipoCampo, v: ValorCampo, formato?: string): string | null {
  if (estaVacio(v)) return null;
  switch (tipo) {
    case "texto": {
      const s = String(v).trim();
      if (formato === "mayusculas") return s.toUpperCase();
      if (formato === "minusculas") return s.toLowerCase();
      if (formato === "capitalizar") return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      return s;
    }
    case "clp":
    case "numero": {
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      if (tipo === "clp" && formato !== "numero") return formatearClp(v);
      return formatearNumero(v, formato === "entero" || formato === "numero" ? 0 : 2);
    }
    case "fecha": {
      const f = aFecha(v);
      if (f === null) return null;
      return formato === "fecha_hora" ? formatearFechaHora(f) : formatearFecha(f);
    }
    case "booleano":
      return typeof v === "boolean" ? (v ? "Sí" : "No") : null;
    case "url":
      return typeof v === "string" && urlSegura(v) ? v : null;
  }
}
