/** Borrador de la lista de costos predefinidos de la empresa en pantalla (CAR-213). */
export type FilaPredefinido = {
  clave: string;
  categoria: string;
  monto: string;
  alcance: "global" | "por_puesto";
  activo: boolean;
};

export type ErroresPredefinidos = { filas: { categoria?: string; monto?: string }[]; ok: boolean };

/** Categoría repetida con el mismo alcance, categoría vacía o monto inválido; los montos son dígitos. */
export function validarPredefinidos(filas: readonly FilaPredefinido[]): ErroresPredefinidos {
  const vistas = new Map<string, number>();
  for (const f of filas) vistas.set(`${f.alcance}:${f.categoria}`, (vistas.get(`${f.alcance}:${f.categoria}`) ?? 0) + 1);
  const out = filas.map((f) => {
    const e: { categoria?: string; monto?: string } = {};
    if (!f.categoria) e.categoria = "Elige una categoría.";
    else if ((vistas.get(`${f.alcance}:${f.categoria}`) ?? 0) > 1) e.categoria = "Esa categoría ya está en la lista con el mismo alcance.";
    if (f.monto === "" || !/^\d+$/.test(f.monto)) e.monto = "Escribe un monto mensual en pesos, sin signo.";
    return e;
  });
  return { filas: out, ok: out.every((e) => Object.keys(e).length === 0) };
}

/** Entrada de `cpq.costos_predefinidos.guardar`, en el orden de la lista. */
export function entradaPredefinidos(filas: readonly FilaPredefinido[]) {
  return filas.map((f) => ({ categoria: f.categoria, montoClp: Number.parseInt(f.monto, 10), alcance: f.alcance, activo: f.activo }));
}

/** «Se cargarán 2 costos en cotizaciones nuevas». */
export function efectoPredefinidos(filas: readonly FilaPredefinido[]): string {
  const n = filas.filter((f) => f.activo).length;
  if (n === 0) return "No se cargará ningún costo en cotizaciones nuevas.";
  return `Se cargará${n === 1 ? "" : "n"} ${n} ${n === 1 ? "costo" : "costos"} en cotizaciones nuevas.`;
}
