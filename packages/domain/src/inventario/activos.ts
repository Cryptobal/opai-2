// Activos de Inventario (CAR-236, ADR-116; referente Snipe-IT: activos por unidad con código y campos
// propios de su tipo). Reglas R10 a R14 de docs/2.0/modulos/inventario.md.
import type { CampoTipo } from "./tipos";

export const ESTADOS_ACTIVO = ["disponible", "asignado", "en_reparacion", "de_baja"] as const;
export type EstadoActivo = (typeof ESTADOS_ACTIVO)[number];

export const ETIQUETA_ESTADO_ACTIVO: Readonly<Record<EstadoActivo, string>> = {
  disponible: "Disponible",
  asignado: "Asignado",
  en_reparacion: "En reparación",
  de_baja: "De baja",
};

export const LIMITES_ACTIVO = { codigoMin: 1, codigoMax: 40, serieMax: 60, valorMax: 200, notasMax: 1000 } as const;

/**
 * R12: transiciones que se hacen a mano. «Asignado» lo ponen y lo quitan la entrega y la devolución
 * (CAR-238); «De baja» no tiene vuelta atrás.
 */
export function transicionManualPermitida(desde: EstadoActivo, hacia: EstadoActivo): boolean {
  if (desde === "de_baja" || desde === hacia) return false;
  if (hacia === "asignado") return false;
  if (desde === "asignado") return false;
  return true;
}

/** R10: código del activo como se compara (sin espacios de más ni mayúsculas). */
export function codigoNormalizado(codigo: string): string {
  return codigo.trim().replace(/\s+/g, " ").toUpperCase();
}

const FECHA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export type ValoresActivo = Record<string, string | number>;

/**
 * R11: valida los valores de los campos propios contra su tipo. Devuelve los valores limpios (sin
 * vacíos) o el error de negocio. Un valor de un campo que el tipo no tiene se rechaza.
 */
export function validarValores(
  campos: readonly CampoTipo[],
  entrada: Readonly<Record<string, unknown>>,
): { ok: true; valores: ValoresActivo } | { ok: false; error: string } {
  const porClave = new Map(campos.map((c) => [c.clave, c]));
  const ajena = Object.keys(entrada).find((k) => !porClave.has(k));
  if (ajena) return { ok: false, error: `El campo «${ajena}» no es de este tipo.` };
  const valores: ValoresActivo = {};
  for (const c of campos) {
    const crudo = entrada[c.clave];
    const vacio = crudo === undefined || crudo === null || (typeof crudo === "string" && crudo.trim() === "");
    if (vacio) {
      if (c.obligatorio) return { ok: false, error: `Falta «${c.etiqueta}».` };
      continue;
    }
    if (c.tipo === "numero") {
      const n = typeof crudo === "number" ? crudo : Number(String(crudo).replace(",", "."));
      if (!Number.isFinite(n)) return { ok: false, error: `«${c.etiqueta}» debe ser un número.` };
      valores[c.clave] = n;
    } else if (c.tipo === "fecha") {
      if (typeof crudo !== "string" || !FECHA.test(crudo))
        return { ok: false, error: `«${c.etiqueta}» debe ser una fecha (aaaa-mm-dd).` };
      valores[c.clave] = crudo;
    } else {
      const texto = String(crudo).trim();
      if (texto.length > LIMITES_ACTIVO.valorMax)
        return { ok: false, error: `«${c.etiqueta}» admite hasta ${LIMITES_ACTIVO.valorMax} caracteres.` };
      valores[c.clave] = texto;
    }
  }
  return { ok: true, valores };
}
