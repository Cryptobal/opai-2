import type { PersonaDetalle } from "@/lib/tipos-maestros";
import type { Nivel, PuestoDeCargo } from "@/lib/tipos-sueldo";

/** Rótulos de los tres niveles: persona (excepción), puesto elegido y cargo del vínculo. */
export function rotulosDe(p: PersonaDetalle, puesto: PuestoDeCargo | undefined) {
  return {
    persona: { titulo: "Persona", detalle: "excepción" },
    puesto: {
      titulo: "Puesto",
      detalle: puesto ? `${puesto.instalacion} · ${puesto.nombre}` : "sin puesto elegido",
    },
    cargo: { titulo: "Cargo", detalle: p.vinculoVigente?.cargo ?? "sin vínculo" },
  } satisfies Record<Nivel, { titulo: string; detalle: string }>;
}
