import { vigenteEn, type Estructura } from "./estructuras";

/** Una capa se selecciona completa; los conceptos nunca pasan de una capa a otra. */
export type CapaSueldo = "persona" | "puesto" | "instalacion";
export type EstructuraCapa = Omit<Estructura, "nivel"> & { nivel: CapaSueldo };
export type ConceptoFaltante =
  "sueldoBase" | "colacion" | "movilizacion" | "gratificacion" | "gratificacionMonto";

export function conceptosFaltantes(e: EstructuraCapa): ConceptoFaltante[] {
  const faltantes: ConceptoFaltante[] = [];
  for (const concepto of ["sueldoBase", "colacion", "movilizacion", "gratificacion"] as const) {
    if (e[concepto] == null) faltantes.push(concepto);
  }
  if (e.gratificacion === "monto_fijo" && e.gratificacionMonto == null) {
    faltantes.push("gratificacionMonto");
  }
  return faltantes;
}

export function validarEstructuraCompleta(e: EstructuraCapa): void {
  const faltantes = conceptosFaltantes(e);
  if (faltantes.length) throw new Error(`Estructura incompleta: faltan ${faltantes.join(", ")}`);
}

export type ResolucionCapas = {
  capa: CapaSueldo | null;
  estructura: EstructuraCapa | null;
  capas: Record<CapaSueldo, EstructuraCapa | null>;
  estado: "sin_capa" | "incompleta" | "completa";
  conceptosFaltantes: ConceptoFaltante[];
};

/** Las candidatas corresponden únicamente a las referencias explícitas del llamador. */
export function resolverCapasSueldo(
  fecha: string,
  candidatas: Partial<Record<CapaSueldo, readonly EstructuraCapa[]>>,
): ResolucionCapas {
  const elegir = (capa: CapaSueldo) =>
    (candidatas[capa] ?? [])
      .filter((e) => e.nivel === capa && vigenteEn(e, fecha))
      .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))[0] ?? null;
  const capas = {
    persona: elegir("persona"),
    puesto: elegir("puesto"),
    instalacion: elegir("instalacion"),
  };
  const capa = (["persona", "puesto", "instalacion"] as const).find((c) => capas[c]) ?? null;
  const estructura = capa ? capas[capa] : null;
  const faltantes = estructura ? conceptosFaltantes(estructura) : [];
  return {
    capa,
    estructura,
    capas,
    estado: !estructura ? "sin_capa" : faltantes.length ? "incompleta" : "completa",
    conceptosFaltantes: faltantes,
  };
}
