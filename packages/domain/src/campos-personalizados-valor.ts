// CAR-536 · Validación y normalización del valor de un campo personalizado según su tipo.
import type { FormatoNumeroCampo, TipoCampoPersonalizado } from "./campos-personalizados";
import { normalizarRut } from "./rut";
import { normalizarTelefono } from "./telefono";

export type ValorCampoPersonalizado = string | number | boolean | string[] | null;
export type ResultadoValorCampo =
  | { ok: true; valor: ValorCampoPersonalizado }
  | { ok: false; error: string };

/** Lo que la validación necesita del campo: tipo, valores internos de sus opciones y formato. */
export type CampoValidable = {
  tipo: TipoCampoPersonalizado;
  opciones: readonly string[];
  formato: FormatoNumeroCampo | null;
};

export const MAX_TEXTO_CAMPO = 500;
export const MAX_TEXTO_LARGO_CAMPO = 5000;
const MAX_NUMERO = 1e15;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ok = (valor: ValorCampoPersonalizado): ResultadoValorCampo => ({ ok: true, valor });
const error = (e: string): ResultadoValorCampo => ({ ok: false, error: e });
const texto = (v: unknown): string | null => (typeof v === "string" ? v.trim() : null);

function fechaValida(s: string): boolean {
  if (!FECHA.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function textoHasta(max: number) {
  return (v: unknown) => {
    const t = texto(v);
    if (t === null) return error("Debe ser texto.");
    return t.length > max ? error(`Máximo ${max} caracteres.`) : ok(t);
  };
}

function numero(v: unknown, c: CampoValidable): ResultadoValorCampo {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || Math.abs(n) > MAX_NUMERO) return error("Debe ser un número.");
  const entero = c.formato === "entero" || c.formato === "moneda_clp";
  return entero && !Number.isInteger(n) ? error("Debe ser un número entero.") : ok(n);
}

function unaOpcion(v: unknown, c: CampoValidable): ResultadoValorCampo {
  return typeof v === "string" && c.opciones.includes(v) ? ok(v) : error("Debe ser una de las opciones del campo.");
}

function variasOpciones(v: unknown, c: CampoValidable): ResultadoValorCampo {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || !c.opciones.includes(x)))
    return error("Deben ser opciones del campo.");
  const elegidas = c.opciones.filter((o) => v.includes(o));
  return ok(elegidas.length > 0 ? elegidas : null);
}

function url(v: unknown): ResultadoValorCampo {
  const t = texto(v);
  if (t === null || t.length > 2000) return error("Debe ser una dirección web.");
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    const valida = (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
    return valida ? ok(u.toString()) : error("Debe ser una dirección web http o https.");
  } catch {
    return error("Debe ser una dirección web.");
  }
}

function telefono(v: unknown): ResultadoValorCampo {
  const t = texto(v) ?? "";
  const chile = normalizarTelefono(t);
  if (chile) return ok(chile);
  const internacional = t.replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(internacional) ? ok(internacional) : error("Debe ser un teléfono válido.");
}

const VALIDADORES: Record<
  TipoCampoPersonalizado,
  (v: unknown, c: CampoValidable) => ResultadoValorCampo
> = {
  texto: textoHasta(MAX_TEXTO_CAMPO),
  texto_largo: textoHasta(MAX_TEXTO_LARGO_CAMPO),
  numero,
  fecha: (v) => (typeof v === "string" && fechaValida(v) ? ok(v) : error("Debe ser una fecha AAAA-MM-DD.")),
  fecha_hora: (v) => {
    const d = typeof v === "string" && FECHA_HORA.test(v) ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? ok(d.toISOString()) : error("Debe ser fecha y hora ISO 8601.");
  },
  si_no: (v) => (typeof v === "boolean" ? ok(v) : error("Debe ser sí o no.")),
  lista: unaOpcion,
  radio: unaOpcion,
  multiple: variasOpciones,
  email: (v) => {
    const t = texto(v)?.toLowerCase() ?? "";
    return t.length <= 254 && EMAIL.test(t) ? ok(t) : error("Debe ser un correo válido.");
  },
  telefono,
  url,
  rut: (v) => {
    const rut = normalizarRut(texto(v) ?? "");
    return rut ? ok(rut) : error("Debe ser un RUT válido.");
  },
  usuario: (v) => (typeof v === "string" && UUID.test(v) ? ok(v.toLowerCase()) : error("Debe ser un usuario de la empresa.")),
};

/**
 * Valida y normaliza el valor de un campo según su tipo. `null`, texto vacío o lista vacía borran el
 * valor (la obligatoriedad se exige aparte, al guardar la ficha). Que un usuario sea miembro de la
 * empresa lo verifica la capacidad, que tiene la base.
 */
export function validarValorCampo(campo: CampoValidable, valor: unknown): ResultadoValorCampo {
  const vacio =
    valor === null ||
    valor === undefined ||
    (typeof valor === "string" && valor.trim() === "") ||
    (Array.isArray(valor) && valor.length === 0);
  return vacio ? ok(null) : VALIDADORES[campo.tipo](valor, campo);
}
