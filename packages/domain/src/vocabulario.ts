// Vocabulario por vertical (ADR-006). El código usa términos genéricos; lo visible pasa por aquí.

export const VERTICALES = ["seguridad", "aseo", "outsourcing", "mantenimiento"] as const;
export type Vertical = (typeof VERTICALES)[number];

export const TERMINOS = [
  "persona",
  "instalacion",
  "puesto",
  "supervisor",
  "recorrido",
  "novedad",
] as const;
export type Termino = (typeof TERMINOS)[number];

export type Palabra = { singular: string; plural: string };
export type Vocabulario = Readonly<Record<Termino, Palabra>> & { vertical: string };

const p = (singular: string, plural: string): Palabra => ({ singular, plural });

const DICCIONARIO: Readonly<Record<Vertical, Vocabulario>> = {
  seguridad: {
    vertical: "Seguridad",
    persona: p("guardia", "guardias"),
    instalacion: p("instalación", "instalaciones"),
    puesto: p("puesto", "puestos"),
    supervisor: p("supervisor", "supervisores"),
    recorrido: p("ronda", "rondas"),
    novedad: p("novedad", "novedades"),
  },
  aseo: {
    vertical: "Aseo",
    persona: p("operario", "operarios"),
    instalacion: p("instalación", "instalaciones"),
    puesto: p("puesto", "puestos"),
    supervisor: p("supervisor", "supervisores"),
    recorrido: p("recorrido", "recorridos"),
    novedad: p("incidencia", "incidencias"),
  },
  outsourcing: {
    vertical: "Outsourcing",
    persona: p("colaborador", "colaboradores"),
    instalacion: p("faena", "faenas"),
    puesto: p("puesto", "puestos"),
    supervisor: p("supervisor", "supervisores"),
    recorrido: p("recorrido", "recorridos"),
    novedad: p("novedad", "novedades"),
  },
  mantenimiento: {
    vertical: "Mantenimiento",
    persona: p("técnico", "técnicos"),
    instalacion: p("sitio", "sitios"),
    puesto: p("puesto", "puestos"),
    supervisor: p("jefe de cuadrilla", "jefes de cuadrilla"),
    recorrido: p("visita", "visitas"),
    novedad: p("incidencia", "incidencias"),
  },
};

export function esVertical(valor: string): valor is Vertical {
  return (VERTICALES as readonly string[]).includes(valor);
}

/** Diccionario de la vertical. Una vertical desconocida usa el de seguridad (la de Gard). */
export function vocabulario(vertical: string): Vocabulario {
  return DICCIONARIO[esVertical(vertical) ? vertical : "seguridad"];
}

/** Primera letra en mayúscula, para títulos y etiquetas ("Guardias", "Rondas"). */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase("es-CL") + texto.slice(1);
}
