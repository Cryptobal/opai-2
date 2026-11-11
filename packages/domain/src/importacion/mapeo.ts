import type { CampoImportable, DefinicionImportador, Mapeo } from "./tipos";

/** Forma comparable de un encabezado: sin tildes, sin signos, en minúscula. «Razón Social» = «razon_social». */
export const claveDeEncabezado = (t: string): string =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const nombresDe = (c: CampoImportable): string[] => [c.clave, c.etiqueta, ...(c.sinonimos ?? [])].map(claveDeEncabezado);

/**
 * Propone a qué campo va cada columna comparando el encabezado con la clave, la etiqueta y los
 * sinónimos de cada campo. Cada campo se asigna a una sola columna (la primera que calza); lo que no
 * calza queda en null para que la persona lo mapee a mano o lo ignore.
 */
export function sugerirMapeo(columnas: readonly string[], def: DefinicionImportador): Mapeo {
  const usados = new Set<string>();
  const mapeo: Mapeo = {};
  for (const col of columnas) {
    const k = claveDeEncabezado(col);
    const campo = def.campos.find((c) => !usados.has(c.clave) && nombresDe(c).includes(k));
    mapeo[col] = campo?.clave ?? null;
    if (campo) usados.add(campo.clave);
  }
  return mapeo;
}

export type MapeoResuelto = {
  mapeo: Mapeo;
  /** Columnas de la planilla que no se usan. */
  columnasIgnoradas: string[];
  /** Campos obligatorios que ninguna columna cubre: sin ellos no se puede importar. */
  requeridosSinColumna: string[];
  /** Problemas del mapeo entregado a mano (campo inexistente, dos columnas al mismo campo). */
  problemas: string[];
};

/** Combina la sugerencia automática con el mapeo que entregó la persona (que manda) y lo valida. */
export function resolverMapeo(columnas: readonly string[], def: DefinicionImportador, manual: Mapeo = {}): MapeoResuelto {
  const claves = new Set(def.campos.map((c) => c.clave));
  const problemas: string[] = [];
  const mapeo: Mapeo = {};
  const manuales = new Map(Object.entries(manual));
  const fijados = new Set([...manuales.values()].filter((v): v is string => !!v));
  const sugerido = sugerirMapeo(columnas, def);
  for (const [col, campo] of manuales) {
    if (!columnas.includes(col)) problemas.push(`La columna «${col}» no existe en la planilla.`);
    else if (campo && !claves.has(campo)) problemas.push(`El campo «${campo}» no existe en este importador.`);
  }
  const vistos = new Set<string>();
  for (const col of columnas) {
    const manualDe = manuales.has(col) ? (manuales.get(col) ?? null) : undefined;
    const propuesto = manualDe !== undefined ? manualDe : fijados.has(sugerido[col] ?? "") ? null : (sugerido[col] ?? null);
    const campo = propuesto && claves.has(propuesto) ? propuesto : null;
    if (campo && vistos.has(campo)) {
      problemas.push(`Dos columnas apuntan al campo «${campo}»; deja solo una.`);
      mapeo[col] = null;
    } else {
      mapeo[col] = campo;
      if (campo) vistos.add(campo);
    }
  }
  return {
    mapeo,
    columnasIgnoradas: columnas.filter((c) => !mapeo[c]),
    requeridosSinColumna: def.campos.filter((c) => c.requerido && !vistos.has(c.clave)).map((c) => c.etiqueta),
    problemas,
  };
}
