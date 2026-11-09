/** Arma la entrada de `cpq.lineas.agregar_esquema` desde la hoja «Agregar cobertura» (CAR-212). */
export type AjusteTramo = { cargoId: string; sueldo: string };

export type BorradorCobertura = {
  seccionId: string;
  esquemaId: string;
  modo: "todos" | "tramo";
  todos: AjusteTramo;
  porTramo: Record<string, AjusteTramo>;
};

const SIN = "";
const sueldoNum = (s: string) => (s === SIN ? undefined : Number(s));

/** El sueldo solo viaja con `cpq:costos.ver`; sin cargo ni sueldo la capacidad deja el costo pendiente. */
export function entradaCobertura(b: BorradorCobertura, verCostos: boolean) {
  const base = { seccionId: b.seccionId, esquemaId: b.esquemaId };
  if (b.modo === "todos") {
    const sueldo = verCostos ? sueldoNum(b.todos.sueldo) : undefined;
    return {
      ...base,
      ...(b.todos.cargoId ? { cargoId: b.todos.cargoId } : {}),
      ...(sueldo !== undefined ? { sueldoBaseClp: sueldo } : {}),
    };
  }
  const porTramo = Object.entries(b.porTramo)
    .map(([tramoId, a]) => {
      const sueldo = verCostos ? sueldoNum(a.sueldo) : undefined;
      return { tramoId, ...(a.cargoId ? { cargoId: a.cargoId } : {}), ...(sueldo !== undefined ? { sueldoBaseClp: sueldo } : {}) };
    })
    .filter((t) => t.cargoId !== undefined || t.sueldoBaseClp !== undefined);
  return { ...base, ...(porTramo.length > 0 ? { porTramo } : {}) };
}
