import type { PersonaDetalle } from "@/lib/tipos-maestros";
import type { Nivel, PuestoDeCargo } from "@/lib/tipos-sueldo";

/** Rótulos de los tres niveles: persona (excepción), puesto elegido y cargo del vínculo. */
export function rotulosDe(_p: PersonaDetalle, puesto: PuestoDeCargo | undefined) {
  return {
    persona: { titulo: "Persona", detalle: "excepción" },
    puesto: {
      titulo: "Puesto",
      detalle: puesto ? `${puesto.instalacion} · ${puesto.nombre}` : "sin puesto elegido",
    },
    instalacion: { titulo: "Instalación", detalle: puesto?.instalacion ?? "sin instalación elegida" },
  } satisfies Record<Nivel, { titulo: string; detalle: string }>;
}
