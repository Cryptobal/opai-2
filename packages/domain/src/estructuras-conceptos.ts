// Resolución por concepto (diseño "sueldo en tres niveles", ADR-005): cada concepto toma el valor
// del nivel más específico que lo define (persona → puesto → cargo). Un bono se identifica por su
// nombre: el de un nivel más específico reemplaza al del mismo nombre.
import type { Estructura, Gratificacion, ItemEstructura, NivelEstructura } from "./estructuras";

const ORDEN: readonly NivelEstructura[] = ["persona", "puesto", "cargo"];

export type ValorConcepto = number | Gratificacion | ItemEstructura | null;

export type ConceptoResuelto = {
  /** "sueldoBase", "colacion", "movilizacion", "gratificacion" o "bono:<nombre>". */
  clave: string;
  nombre: string;
  valores: Record<NivelEstructura, ValorConcepto>;
  final: ValorConcepto;
  origen: NivelEstructura | null;
};

export type Combinacion = {
  /** Estructura efectiva con todos los conceptos resueltos (para `haberes`). */
  estructura: Estructura | null;
  conceptos: ConceptoResuelto[];
};

type Niveles = Record<NivelEstructura, Estructura | null>;

const FIJOS = [
  ["sueldoBase", "Sueldo base"],
  ["colacion", "Colación"],
  ["movilizacion", "Movilización"],
  ["gratificacion", "Gratificación legal"],
] as const;

function resolver(
  clave: string,
  nombre: string,
  valor: (e: Estructura) => ValorConcepto,
  n: Niveles,
): ConceptoResuelto {
  const valores = {
    persona: n.persona ? valor(n.persona) : null,
    puesto: n.puesto ? valor(n.puesto) : null,
    cargo: n.cargo ? valor(n.cargo) : null,
  };
  const origen = ORDEN.find((nivel) => valores[nivel] !== null) ?? null;
  return { clave, nombre, valores, final: origen ? valores[origen] : null, origen };
}

/** Combina los tres niveles vigentes concepto a concepto. */
export function combinarPorConcepto(n: Niveles): Combinacion {
  const conceptos: ConceptoResuelto[] = FIJOS.map(([clave, nombre]) =>
    resolver(clave, nombre, (e) => e[clave], n),
  );
  const bonos = new Set(ORDEN.flatMap((nivel) => n[nivel]?.items.map((i) => i.nombre) ?? []));
  for (const nombre of bonos) {
    conceptos.push(
      resolver(
        `bono:${nombre}`,
        nombre,
        (e) => e.items.find((i) => i.nombre === nombre) ?? null,
        n,
      ),
    );
  }
  const base = ORDEN.map((nivel) => n[nivel]).find((e) => e !== null) ?? null;
  if (!base) return { estructura: null, conceptos };
  const final = (clave: string) => conceptos.find((c) => c.clave === clave)?.final ?? null;
  const estructura: Estructura = {
    ...base,
    sueldoBase: (final("sueldoBase") as number | null) ?? 0,
    colacion: (final("colacion") as number | null) ?? 0,
    movilizacion: (final("movilizacion") as number | null) ?? 0,
    gratificacion: (final("gratificacion") as Gratificacion | null) ?? "ninguna",
    gratificacionMonto:
      ORDEN.map((nivel) => n[nivel]).find((e) => e?.gratificacion != null)?.gratificacionMonto ??
      null,
    items: conceptos
      .filter((c) => c.clave.startsWith("bono:") && c.final !== null)
      .map((c) => c.final as ItemEstructura),
  };
  return { estructura, conceptos };
}
