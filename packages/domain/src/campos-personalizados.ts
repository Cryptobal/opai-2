// CAR-27 · Campos personalizados por empresa en cuentas, contactos y negocios (patrón «propiedades
// a medida» de HubSpot, REFERENTES-saas §4). Lógica pura: clave estable y validación del valor por tipo.

export const ENTIDADES_CAMPO_PERSONALIZADO = ["cuenta", "contacto", "negocio"] as const;
export type EntidadCampoPersonalizado = (typeof ENTIDADES_CAMPO_PERSONALIZADO)[number];

export const TIPOS_CAMPO_PERSONALIZADO = ["texto", "numero", "fecha", "lista", "si_no"] as const;
export type TipoCampoPersonalizado = (typeof TIPOS_CAMPO_PERSONALIZADO)[number];

export const MAX_TEXTO_CAMPO = 500;
export const MAX_OPCIONES_CAMPO = 50;
const MAX_CLAVE = 40;

/** Clave estable en snake_case ASCII a partir del nombre («N° de guardias» → `n_de_guardias`). */
export function claveCampoPersonalizado(etiqueta: string): string {
  const base = etiqueta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_CLAVE)
    .replace(/_+$/g, "");
  return /^[a-z]/.test(base) ? base : `campo_${base}`.slice(0, MAX_CLAVE).replace(/_+$/g, "");
}

export type ValorCampoPersonalizado = string | number | boolean | null;
export type ResultadoValorCampo =
  | { ok: true; valor: ValorCampoPersonalizado }
  | { ok: false; error: string };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function fechaValida(s: string): boolean {
  if (!FECHA.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Valida y normaliza el valor de un campo según su tipo. `null` o texto vacío borran el valor
 * (la obligatoriedad se exige aparte, al guardar la ficha).
 */
export function validarValorCampo(
  tipo: TipoCampoPersonalizado,
  opciones: readonly string[],
  valor: unknown,
): ResultadoValorCampo {
  if (valor === null || valor === undefined || (typeof valor === "string" && valor.trim() === ""))
    return { ok: true, valor: null };
  switch (tipo) {
    case "texto": {
      if (typeof valor !== "string") return { ok: false, error: "Debe ser texto." };
      const t = valor.trim();
      return t.length > MAX_TEXTO_CAMPO
        ? { ok: false, error: `Máximo ${MAX_TEXTO_CAMPO} caracteres.` }
        : { ok: true, valor: t };
    }
    case "numero": {
      const n = typeof valor === "number" ? valor : typeof valor === "string" ? Number(valor.replace(",", ".")) : NaN;
      return Number.isFinite(n) ? { ok: true, valor: n } : { ok: false, error: "Debe ser un número." };
    }
    case "fecha":
      return typeof valor === "string" && fechaValida(valor)
        ? { ok: true, valor }
        : { ok: false, error: "Debe ser una fecha AAAA-MM-DD." };
    case "lista":
      return typeof valor === "string" && opciones.includes(valor)
        ? { ok: true, valor }
        : { ok: false, error: "Debe ser una de las opciones del campo." };
    case "si_no":
      return typeof valor === "boolean" ? { ok: true, valor } : { ok: false, error: "Debe ser sí o no." };
  }
}

/** Opciones de una lista: sin vacías ni repetidas (sin distinguir mayúsculas), en el orden dado. */
export function normalizarOpcionesCampo(opciones: readonly string[]): string[] {
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const o of opciones) {
    const t = o.trim();
    const k = t.toLowerCase();
    if (!t || vistas.has(k)) continue;
    vistas.add(k);
    salida.push(t);
  }
  return salida;
}
