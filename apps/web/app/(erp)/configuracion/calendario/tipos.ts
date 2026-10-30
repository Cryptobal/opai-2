/** Fila del calendario tal como la devuelve `core.calendario.listar`. */
export type DiaVista = {
  id: string;
  fecha: string;
  tipo: string;
  nombre: string;
  irrenunciable: boolean;
  fuente: "nacional" | "regional" | "tenant";
  region: string | null;
  instalacionId: string | null;
  /** true solo para las filas del tenant: los legales automáticos y los de plataforma no se editan. */
  editable: boolean;
  /** true si es un feriado legal calculado por regla (CAR-79): «Legal (automático)». */
  automatico: boolean;
};

const ETIQUETA_FUENTE: Record<DiaVista["fuente"], string> = {
  nacional: "Nacional",
  regional: "Regional",
  tenant: "De la empresa",
};

/** Origen que se muestra: los legales calculados por regla se distinguen como «Legal (automático)». */
export function etiquetaOrigen(d: Pick<DiaVista, "fuente" | "automatico">): string {
  return d.automatico ? "Legal (automático)" : ETIQUETA_FUENTE[d.fuente];
}

/** Años que ofrece el filtro rápido; cualquier año válido también vale por `?anio=`. */
export const ANIOS = [2026, 2027, 2028] as const;
export const ANIO_DEFECTO = 2026;
/** Rango que acepta la capacidad `core.calendario.listar` (input `anio`). */
export const ANIO_MIN = 2000;
export const ANIO_MAX = 2100;

/** Año crudo del `?anio=` a {anio, fueraDeRango}: un valor fuera de rango no cae en silencio al defecto. */
export function resolverAnio(bruto: string | undefined): { anio: number; fueraDeRango: boolean } {
  if (bruto === undefined || bruto === "") return { anio: ANIO_DEFECTO, fueraDeRango: false };
  const n = Number(bruto);
  const valido = Number.isInteger(n) && n >= ANIO_MIN && n <= ANIO_MAX;
  return { anio: valido ? n : ANIO_DEFECTO, fueraDeRango: !valido };
}

/** Fecha ISO `aaaa-mm-dd` a `dd-mm-aaaa` (es-CL) sin crear un Date (no depende de la zona). */
export function fechaCl(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}-${m}-${a}`;
}
