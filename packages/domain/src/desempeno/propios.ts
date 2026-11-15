// Indicadores propios de una empresa (CAR-313, ADR-094 §8): se arman sobre hechos que los módulos
// declaran, con cuatro formas de cálculo acotadas. La definición es configuración versionada de la
// empresa y se evalúa aquí, en dominio puro (ADR-021); nunca es código por empresa.

import { porcentajeDe } from "../indicadores-gestion";

export const FORMAS_PROPIO = ["contar", "sumar", "tiempo", "porcentaje"] as const;
export type FormaPropio = (typeof FORMAS_PROPIO)[number];

/** Uso de un hecho, con filtros opcionales: atributo → valores aceptados. */
export type UsoDeHecho = { hecho: string; filtros?: Readonly<Record<string, readonly string[]>> };

export type DefinicionPropio =
  | ({ forma: "contar" } & UsoDeHecho)
  | ({ forma: "sumar"; monto: string } & UsoDeHecho)
  | { forma: "tiempo"; desde: UsoDeHecho; hasta: UsoDeHecho; unidad: "horas" | "dias" }
  | { forma: "porcentaje"; parte: UsoDeHecho; total: UsoDeHecho };

/** Lo que un módulo declara de un hecho, visto desde el dominio. */
export type HechoDeclarado = {
  id: string;
  sujeto: string;
  /** Entidad a la que pertenece el hecho; dos hechos solo se emparejan si es la misma. */
  entidad: string;
  montos: readonly { id: string; unidad: string }[];
  atributos: readonly { id: string; valores: readonly string[] }[];
};

/** Una vez que ocurrió el hecho. */
export type Ocurrencia = {
  sujetoId: string | null;
  en: Date;
  /** Id de la entidad (negocio, solicitud, tarea): empareja dos hechos de la misma. */
  clave: string;
  montos?: Readonly<Record<string, number>>;
  atributos?: Readonly<Record<string, string>>;
};

/** Hechos que usa una definición, en orden y sin repetir. */
export function hechosDe(def: DefinicionPropio): UsoDeHecho[] {
  if (def.forma === "tiempo") return [def.desde, def.hasta];
  if (def.forma === "porcentaje") return [def.parte, def.total];
  return [{ hecho: def.hecho, ...(def.filtros ? { filtros: def.filtros } : {}) }];
}

/** Unidad del resultado; null si la definición no es válida. */
export function unidadDePropio(
  def: DefinicionPropio,
  hechos: ReadonlyMap<string, HechoDeclarado>,
): string | null {
  if (def.forma === "contar") return "cantidad";
  if (def.forma === "porcentaje") return "porcentaje";
  if (def.forma === "tiempo") return def.unidad;
  return hechos.get(def.hecho)?.montos.find((m) => m.id === def.monto)?.unidad ?? null;
}

/** Problemas de una definición contra los hechos disponibles de la empresa. Vacío = válida. */
export function erroresDePropio(
  def: DefinicionPropio,
  hechos: ReadonlyMap<string, HechoDeclarado>,
): string[] {
  const errores: string[] = [];
  const usados = hechosDe(def);
  for (const uso of usados) {
    const hecho = hechos.get(uso.hecho);
    if (!hecho) {
      errores.push(`«${uso.hecho}» no es un hecho disponible para la empresa.`);
      continue;
    }
    for (const [atributo, valores] of Object.entries(uso.filtros ?? {})) {
      const declarado = hecho.atributos.find((a) => a.id === atributo);
      if (!declarado) errores.push(`«${uso.hecho}» no se puede filtrar por «${atributo}».`);
      else if (valores.length === 0 || valores.some((v) => !declarado.valores.includes(v))) {
        errores.push(`El filtro «${atributo}» de «${uso.hecho}» tiene un valor que no existe.`);
      }
    }
  }
  if (errores.length > 0) return errores;
  const [a, b] = usados.map((u) => hechos.get(u.hecho));
  if (def.forma === "sumar" && unidadDePropio(def, hechos) === null) {
    errores.push(`«${def.hecho}» no tiene el monto «${def.monto}».`);
  }
  if (a && b && a.sujeto !== b.sujeto) {
    errores.push("Los dos hechos se atribuyen a sujetos distintos (usuario y Persona): no se pueden combinar.");
  }
  if (def.forma === "tiempo" && def.desde.hecho === def.hasta.hecho) {
    errores.push("El hecho de inicio y el de cierre deben ser distintos.");
  } else if (def.forma === "tiempo" && a && b && a.entidad !== b.entidad) {
    errores.push("Para medir el tiempo entre dos hechos, ambos deben ser de la misma entidad.");
  }
  return errores;
}

const cumple = (o: Ocurrencia, uso: UsoDeHecho): boolean =>
  Object.entries(uso.filtros ?? {}).every(([atributo, valores]) =>
    valores.includes(o.atributos?.[atributo] ?? ""),
  );

function agrupar(filas: readonly Ocurrencia[], uso: UsoDeHecho): Map<string, Ocurrencia[]> {
  const grupos = new Map<string, Ocurrencia[]>();
  for (const o of filas) {
    if (!o.sujetoId || !cumple(o, uso)) continue;
    grupos.set(o.sujetoId, [...(grupos.get(o.sujetoId) ?? []), o]);
  }
  return grupos;
}

const HORA_MS = 3_600_000;
const unDecimal = (n: number) => Math.round(n * 10) / 10;

/**
 * Valor del indicador por sujeto. `ocurrencias` trae, por id de hecho, lo ocurrido en el período
 * (para el hecho «desde» de la forma tiempo, también lo anterior: el inicio puede ser de otro mes).
 * Sin hechos no hay fila: no es lo mismo que cero.
 */
export function evaluarPropio(
  def: DefinicionPropio,
  ocurrencias: ReadonlyMap<string, readonly Ocurrencia[]>,
): Map<string, number | null> {
  const de = (uso: UsoDeHecho) => agrupar(ocurrencias.get(uso.hecho) ?? [], uso);
  const salida = new Map<string, number | null>();
  if (def.forma === "contar") {
    for (const [sujeto, filas] of de(def)) salida.set(sujeto, filas.length);
  } else if (def.forma === "sumar") {
    for (const [sujeto, filas] of de(def)) {
      salida.set(sujeto, filas.reduce((total, o) => total + (o.montos?.[def.monto] ?? 0), 0));
    }
  } else if (def.forma === "porcentaje") {
    const parte = de(def.parte);
    for (const [sujeto, total] of de(def.total)) {
      salida.set(sujeto, porcentajeDe(parte.get(sujeto)?.length ?? 0, total.length));
    }
  } else {
    // Empareja cada cierre con el inicio más antiguo de la misma entidad.
    const inicios = new Map<string, Date>();
    for (const o of ocurrencias.get(def.desde.hecho) ?? []) {
      if (!cumple(o, def.desde)) continue;
      const previo = inicios.get(o.clave);
      if (!previo || o.en < previo) inicios.set(o.clave, o.en);
    }
    const divisor = def.unidad === "dias" ? HORA_MS * 24 : HORA_MS;
    for (const [sujeto, cierres] of de(def.hasta)) {
      const tiempos = cierres.flatMap((o) => {
        const inicio = inicios.get(o.clave);
        return inicio && o.en >= inicio ? [(o.en.getTime() - inicio.getTime()) / divisor] : [];
      });
      if (tiempos.length === 0) continue;
      salida.set(sujeto, unDecimal(tiempos.reduce((x, y) => x + y, 0) / tiempos.length));
    }
  }
  return salida;
}
