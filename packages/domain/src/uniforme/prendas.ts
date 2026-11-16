// Prendas del uniforme por vertical (CAR-408, Estándares H-5; referente BambooHR / Rippling: lo que cambia por
// empresa es configuración, no columnas). La talla de una persona se guarda por prenda (`clave`). Cada empresa puede
// definir sus prendas; sin lista propia rige la de su vertical.

/** Una prenda del kit: la clave estable con que se guarda la talla y el nombre que ve el usuario. */
export type Prenda = { clave: string; nombre: string };

export const LIMITES_PRENDAS = { prendas: 30, nombreMin: 2, nombreMax: 60, tallaMax: 20 } as const;

/** Formato de la clave de una prenda (minúsculas, números y guion bajo). */
export const CLAVE_PRENDA = /^[a-z][a-z0-9_]{1,39}$/;

/** Clave estable a partir del nombre: «Zapato de seguridad» → «zapato_de_seguridad». */
export function clavePrenda(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return /^[a-z]/.test(base) ? base : `p_${base}`.slice(0, 40);
}

const P = (nombre: string, clave = clavePrenda(nombre)): Prenda => ({ clave, nombre });

const BASE: Prenda[] = [P("Camisa"), P("Pantalón"), P("Calzado")];

const POR_VERTICAL: Record<string, Prenda[]> = {
  // Las siete prendas que la ficha tenía como columnas (CAR-277); conservan sus claves.
  seguridad: [
    P("Camisa"),
    P("Pantalón"),
    P("Chaqueta"),
    P("Polera"),
    P("Geólogo"),
    P("Polar"),
    P("Calzado"),
  ],
  aseo: [P("Cotona"), P("Pantalón"), P("Polera"), P("Polar"), P("Calzado")],
  mantenimiento: [P("Overol"), P("Polera"), P("Chaqueta"), P("Calzado de seguridad")],
};

/** Prendas de la vertical cuando la empresa no definió las suyas. Una vertical sin lista usa la base. */
export function prendasPorVertical(vertical: string): Prenda[] {
  return POR_VERTICAL[vertical] ?? BASE;
}

/** Valida la lista guardada por la empresa (nombres). Null si no sirve; nombres o claves repetidas tampoco. */
export function prendasValidas(valor: unknown): Prenda[] | null {
  if (!Array.isArray(valor) || valor.length > LIMITES_PRENDAS.prendas) return null;
  const prendas: Prenda[] = [];
  const claves = new Set<string>();
  for (const x of valor as unknown[]) {
    const nombre =
      typeof (x as { nombre?: unknown } | null)?.nombre === "string"
        ? (x as { nombre: string }).nombre.trim()
        : "";
    if (nombre.length < LIMITES_PRENDAS.nombreMin || nombre.length > LIMITES_PRENDAS.nombreMax)
      return null;
    const clave = clavePrenda(nombre);
    if (!CLAVE_PRENDA.test(clave) || claves.has(clave)) return null;
    claves.add(clave);
    prendas.push({ clave, nombre });
  }
  return prendas;
}

/** Kit efectivo: el de la empresa si es válido y no está vacío; si no, el de su vertical. */
export function prendasEfectivas(propio: unknown, vertical: string): Prenda[] {
  const r = prendasValidas(propio);
  return r?.length ? r : prendasPorVertical(vertical);
}
