// Opciones de sexo y nacionalidad (ISO 3166-1 alfa-2) de la ficha de persona.

export const SEXOS = [
  { valor: "femenino", etiqueta: "Femenino" },
  { valor: "masculino", etiqueta: "Masculino" },
  { valor: "otro", etiqueta: "Otro" },
  { valor: "no_declara", etiqueta: "Prefiere no declarar" },
];
export const NACIONALIDADES = [
  ["CL", "Chilena"],
  ["PE", "Peruana"],
  ["VE", "Venezolana"],
  ["CO", "Colombiana"],
  ["BO", "Boliviana"],
  ["HT", "Haitiana"],
  ["AR", "Argentina"],
].map(([valor, etiqueta]) => ({ valor: valor ?? "", etiqueta: etiqueta ?? "" }));

export const etiquetaDe = (
  opciones: readonly { valor: string; etiqueta: string }[],
  v: string | null,
) => (v ? (opciones.find((o) => o.valor === v)?.etiqueta ?? v) : null);
