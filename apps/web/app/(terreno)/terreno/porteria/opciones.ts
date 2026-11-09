/** Opciones de los selectores de portería (CAR-78 · E4d). */
export const TIPOS = [
  { valor: "visita", etiqueta: "Visita" },
  { valor: "contratista", etiqueta: "Contratista" },
  { valor: "proveedor", etiqueta: "Proveedor" },
  { valor: "vehiculo", etiqueta: "Vehículo" },
  { valor: "despacho", etiqueta: "Despacho" },
] as const;
export const DOCUMENTOS = [
  { valor: "run", etiqueta: "RUN" },
  { valor: "pasaporte", etiqueta: "Pasaporte" },
  { valor: "otro", etiqueta: "Otro documento" },
] as const;
