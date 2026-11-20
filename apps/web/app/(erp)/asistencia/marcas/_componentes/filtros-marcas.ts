export const FILTROS_MARCAS = [
  { param: "metodoFamilia", etiqueta: "Método", opciones: [{ valor: "rostro", etiqueta: "Rostro" }, { valor: "pin", etiqueta: "PIN" }] },
  {
    param: "gps",
    etiqueta: "GPS",
    opciones: [
      { valor: "dentro", etiqueta: "Dentro" },
      { valor: "fuera", etiqueta: "Fuera" },
      { valor: "sin_gps", etiqueta: "Sin GPS" },
    ],
  },
] as const;