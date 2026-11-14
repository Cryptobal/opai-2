// Jefatura por cargo (CAR-314, ADR-094). Cada cargo declara a qué cargo reporta y a quiénes de ese
// cargo ve cada jefe. Reglas puras: sin base de datos, para que las use Desempeño y cualquier otro
// módulo que necesite saber quién ve a quién (aprobaciones, tickets).

/** A quiénes de un cargo ve cada persona de su jefatura. */
export const MODOS_JEFATURA = ["asignadas", "equipo", "instalaciones"] as const;
export type ModoJefatura = (typeof MODOS_JEFATURA)[number];

export type CargoJefatura = {
  id: string;
  /** Cargo al que reporta. null = no reporta a nadie. */
  jefaturaCargoId: string | null;
  jefaturaVe: ModoJefatura;
};

/** Persona con vínculo vigente, vista desde la jefatura. */
export type PersonaJefatura = {
  id: string;
  cargoId: string;
  /** Jefe directo asignado (modo "asignadas"). */
  jefePersonaId: string | null;
  /** Instalación de su vínculo vigente (modo "instalaciones"). */
  instalacionId: string | null;
  /** Instalaciones que tiene a cargo como jefe (ADR-022), si entra al sistema. */
  instalacionesACargo: readonly string[];
};

/**
 * ¿Poner `jefaturaId` como jefatura de `cargoId` cierra un ciclo? Sube por la cadena de la jefatura
 * propuesta: si llega al propio cargo, hay ciclo (A reporta a B y B reporta a A).
 */
export function cierraCiclo(
  cargos: readonly Pick<CargoJefatura, "id" | "jefaturaCargoId">[],
  cargoId: string,
  jefaturaId: string,
): boolean {
  const arriba = new Map(cargos.map((c) => [c.id, c.jefaturaCargoId]));
  const vistos = new Set<string>();
  let actual: string | null = jefaturaId;
  while (actual !== null && !vistos.has(actual)) {
    if (actual === cargoId) return true;
    vistos.add(actual);
    actual = arriba.get(actual) ?? null;
  }
  return false;
}

/** ¿`jefe` tiene directamente a su cargo a `persona`? Depende del modo del cargo de la persona. */
export function esJefeDirecto(
  jefe: PersonaJefatura,
  persona: PersonaJefatura,
  cargos: ReadonlyMap<string, CargoJefatura>,
): boolean {
  if (jefe.id === persona.id) return false;
  const cargo = cargos.get(persona.cargoId);
  if (!cargo || cargo.jefaturaCargoId !== jefe.cargoId) return false;
  if (cargo.jefaturaVe === "equipo") return true;
  if (cargo.jefaturaVe === "asignadas") return persona.jefePersonaId === jefe.id;
  return persona.instalacionId !== null && jefe.instalacionesACargo.includes(persona.instalacionId);
}

/**
 * Jefes de `persona`. Primero los directos. Si nadie la tiene (sin jefe asignado, o en una
 * instalación que nadie tiene a cargo), no queda invisible: sube por la cadena de cargos hasta el
 * primer nivel que se ve por equipo completo, y sus jefes pasan a ser los de ese nivel.
 */
function jefesDe(
  persona: PersonaJefatura,
  porCargo: ReadonlyMap<string, CargoJefatura>,
  delCargo: ReadonlyMap<string, readonly PersonaJefatura[]>,
): readonly PersonaJefatura[] {
  const cargo = porCargo.get(persona.cargoId);
  if (!cargo?.jefaturaCargoId) return [];
  const directos = (delCargo.get(cargo.jefaturaCargoId) ?? []).filter((j) =>
    esJefeDirecto(j, persona, porCargo),
  );
  if (directos.length > 0) return directos;
  const vistos = new Set<string>([cargo.id]);
  let nivel = porCargo.get(cargo.jefaturaCargoId);
  while (nivel?.jefaturaCargoId && !vistos.has(nivel.id)) {
    vistos.add(nivel.id);
    if (nivel.jefaturaVe === "equipo") {
      return (delCargo.get(nivel.jefaturaCargoId) ?? []).filter((j) => j.id !== persona.id);
    }
    nivel = porCargo.get(nivel.jefaturaCargoId);
  }
  return [];
}

/**
 * A quién reporta cada persona, con la misma regla que `jefesDe` (directos o, si nadie la tiene, los
 * del primer nivel que ve por equipo completo): jefe → personas que le reportan. Nadie queda fuera.
 */
export function reportesPorJefe(
  personas: readonly PersonaJefatura[],
  cargos: readonly CargoJefatura[],
): Map<string, string[]> {
  const porCargo = new Map(cargos.map((c) => [c.id, c]));
  const delCargo = new Map<string, PersonaJefatura[]>();
  for (const p of personas) delCargo.set(p.cargoId, [...(delCargo.get(p.cargoId) ?? []), p]);
  const reportanA = new Map<string, string[]>();
  for (const p of personas) {
    for (const jefe of jefesDe(p, porCargo, delCargo)) {
      reportanA.set(jefe.id, [...(reportanA.get(jefe.id) ?? []), p.id]);
    }
  }
  return reportanA;
}

/**
 * Personas a cargo de `jefeId`: las directas y, hacia abajo, las de cada una de ellas (el jefe del
 * jefe ve toda su línea). No incluye al propio jefe. Tolera ciclos en los datos.
 */
export function personasACargo(
  jefeId: string,
  personas: readonly PersonaJefatura[],
  cargos: readonly CargoJefatura[],
): Set<string> {
  const reportanA = reportesPorJefe(personas, cargos);
  const aCargo = new Set<string>();
  const cola = [jefeId];
  while (cola.length > 0) {
    for (const id of reportanA.get(cola.pop() ?? "") ?? []) {
      if (id === jefeId || aCargo.has(id)) continue;
      aCargo.add(id);
      cola.push(id);
    }
  }
  return aCargo;
}
