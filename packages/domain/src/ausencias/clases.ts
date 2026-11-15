// Clases de ausencia (CAR-393 parte 3; referente Rippling / BambooHR: políticas de time off ligadas a una categoría).
// Los cuatro tipos base son fijos porque la pauta y la nómina dependen de ellos. Cada empresa puede tener su catálogo
// de clases, cada una ligada a un tipo base; sin catálogo propio rige el de su vertical.
export const TIPOS_AUSENCIA_BASE = ["ausencia", "licencia", "vacaciones", "permiso"] as const;
export type TipoAusenciaBase = (typeof TIPOS_AUSENCIA_BASE)[number];

/** Una clase del catálogo: el nombre que ve el usuario y el tipo base que cuenta para la pauta y la nómina. */
export type ClaseAusencia = { nombre: string; tipo: TipoAusenciaBase };

export const LIMITES_CLASES = { clases: 40, nombreMin: 3, nombreMax: 80 } as const;

/** Valida un catálogo guardado (JSON de la empresa). Devuelve null si no sirve; nombres repetidos tampoco sirven. */
export function clasesValidas(valor: unknown): ClaseAusencia[] | null {
  if (!Array.isArray(valor) || valor.length > LIMITES_CLASES.clases) return null;
  const clases: ClaseAusencia[] = [];
  const vistos = new Set<string>();
  for (const x of valor as unknown[]) {
    const c = x as { nombre?: unknown; tipo?: unknown } | null;
    const nombre = typeof c?.nombre === "string" ? c.nombre.trim() : "";
    const tipo = TIPOS_AUSENCIA_BASE.find((t) => t === c?.tipo);
    if (
      nombre.length < LIMITES_CLASES.nombreMin ||
      nombre.length > LIMITES_CLASES.nombreMax ||
      !tipo
    )
      return null;
    const clave = nombre.toLocaleLowerCase("es");
    if (vistos.has(clave)) return null;
    vistos.add(clave);
    clases.push({ nombre, tipo });
  }
  return clases;
}

const C = (tipo: TipoAusenciaBase, nombre: string): ClaseAusencia => ({ nombre, tipo });

/** Clases comunes en Chile (Código del Trabajo): licencias, feriado y permisos legales. */
const BASE: ClaseAusencia[] = [
  C("licencia", "Enfermedad común"),
  C("licencia", "Accidente del trabajo o enfermedad profesional"),
  C("licencia", "Pre y postnatal"),
  C("vacaciones", "Feriado legal"),
  C("vacaciones", "Feriado progresivo"),
  C("permiso", "Con goce de sueldo"),
  C("permiso", "Sin goce de sueldo"),
  C("permiso", "Nacimiento de un hijo"),
  C("permiso", "Fallecimiento de un familiar"),
  C("permiso", "Matrimonio o acuerdo de unión civil"),
  C("ausencia", "Injustificada"),
];

const POR_VERTICAL: Record<string, ClaseAusencia[]> = {};

/** Catálogo por vertical cuando la empresa no definió el suyo. Una vertical sin catálogo propio usa la base. */
export function clasesPorVertical(vertical: string): ClaseAusencia[] {
  return POR_VERTICAL[vertical] ?? BASE;
}

/** Catálogo efectivo: el de la empresa si es válido y no está vacío; si no, el de su vertical. */
export function clasesEfectivas(propio: unknown, vertical: string): ClaseAusencia[] {
  const r = clasesValidas(propio);
  return r?.length ? r : clasesPorVertical(vertical);
}

/** La clase elegida, si existe en el catálogo y corresponde al tipo; si no, null. */
export function claseDelCatalogo(
  catalogo: readonly ClaseAusencia[],
  tipo: string,
  nombre: string,
): ClaseAusencia | null {
  const clave = nombre.trim().toLocaleLowerCase("es");
  return (
    catalogo.find((c) => c.tipo === tipo && c.nombre.toLocaleLowerCase("es") === clave) ?? null
  );
}
