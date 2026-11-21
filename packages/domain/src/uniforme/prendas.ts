// Prendas del uniforme por vertical (CAR-408, Estándares H-5; referente BambooHR / Rippling: lo que cambia por
// empresa es configuración, no columnas). La talla de una persona se guarda por prenda (`clave`). Cada empresa puede
// definir sus prendas; sin lista propia rige la de su vertical.

/** Una prenda del kit: la clave estable con que se guarda la talla y el nombre que ve el usuario. */
export type Prenda = { clave: string; nombre: string; activo?: boolean; orden?: number };

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

const P = (nombre: string, clave = clavePrenda(nombre)): Prenda => ({ clave, nombre, activo: true });

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

type EntradaPrenda = { clave?: string; nombre: string; activo?: boolean; orden?: number };

function igualPrenda(a: EntradaPrenda, b: EntradaPrenda) {
  const ca = typeof a.clave === "string" ? a.clave : clavePrenda(a.nombre);
  const cb = typeof b.clave === "string" ? b.clave : clavePrenda(b.nombre);
  return ca === cb;
}

/**
 * Conserva la clave al renombrar: si la entrada trae clave, mantiene esa clave aunque cambie el nombre.
 * Al agregar sin clave, deriva una nueva que no choque con las existentes.
 */
export function prendasNormalizadas(
  entrada: readonly EntradaPrenda[],
  previo: readonly EntradaPrenda[] = [],
): Prenda[] | null {
  if (entrada.length > LIMITES_PRENDAS.prendas) return null;
  const clavesTomadas = new Set<string>();
  const salida: Prenda[] = [];
  for (let i = 0; i < entrada.length; i++) {
    const x = entrada[i]!;
    const nombre = x.nombre.trim();
    if (nombre.length < LIMITES_PRENDAS.nombreMin || nombre.length > LIMITES_PRENDAS.nombreMax)
      return null;
    let clave = typeof x.clave === "string" && CLAVE_PRENDA.test(x.clave) ? x.clave : "";
    if (!clave) {
      const anterior = previo.find((p) => p.nombre.trim().toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"));
      clave = anterior && typeof anterior.clave === "string" ? anterior.clave : clavePrenda(nombre);
    }
    if (!CLAVE_PRENDA.test(clave) || clavesTomadas.has(clave)) return null;
  /** No renombrar dos entradas distintas a la misma clave por colisión de nombre. */
    const otra = entrada.findIndex((p, j) => j !== i && igualPrenda({ clave, nombre }, p));
    if (otra >= 0) return null;
    clavesTomadas.add(clave);
    const orden = typeof x.orden === "number" && Number.isInteger(x.orden) ? x.orden : i;
    salida.push({ clave, nombre, activo: x.activo !== false, orden });
  }
  const porNombre = new Set(entrada.map((p) => p.nombre.trim().toLocaleLowerCase("es")));
  if (porNombre.size !== entrada.length) return null;
  return salida.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

/** Valida la lista guardada por la empresa (nombres y claves). Null si no sirve. */
export function prendasValidas(valor: unknown): Prenda[] | null {
  if (!Array.isArray(valor)) return null;
  return prendasNormalizadas(valor as EntradaPrenda[]);
}

/** Kit efectivo activo: el de la empresa si es válido y no está vacío; si no, el de su vertical. */
export function prendasEfectivas(propio: unknown, vertical: string): Prenda[] {
  const r = prendasValidas(propio);
  const lista = r?.length ? r : prendasPorVertical(vertical);
  return lista.filter((p) => p.activo !== false);
}

/** Todas las prendas del ajuste propio, incluidas inactivas, para la pantalla de configuración. */
export function prendasConfiguracion(propio: unknown, vertical: string): Prenda[] {
  const r = prendasValidas(propio);
  if (r?.length) return r;
  return prendasPorVertical(vertical).map((p, orden) => ({ ...p, orden }));
}