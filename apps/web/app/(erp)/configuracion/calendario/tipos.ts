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
  /** true solo para las filas del tenant: los feriados de plataforma no se editan. */
  editable: boolean;
};

export const ETIQUETA_FUENTE: Record<DiaVista["fuente"], string> = {
  nacional: "Nacional",
  regional: "Regional",
  tenant: "De la empresa",
};

/** Años que ofrece el filtro; coinciden con el seed de feriados nacionales de plataforma. */
export const ANIOS = [2026, 2027] as const;
export const ANIO_DEFECTO = 2026;

/** Fecha ISO `aaaa-mm-dd` a `dd-mm-aaaa` (es-CL) sin crear un Date (no depende de la zona). */
export function fechaCl(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}-${m}-${a}`;
}
