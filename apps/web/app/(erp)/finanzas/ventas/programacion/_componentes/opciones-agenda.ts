// Opciones de los selectores de agenda de una programación (BRIEF-26).
export const DIAS = [
  { valor: "-1", etiqueta: "Último día del mes" },
  ...Array.from({ length: 31 }, (_, i) => ({ valor: String(i + 1), etiqueta: `Día ${i + 1}` })),
];
export const SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
].map((d, i) => ({
  valor: String(i),
  etiqueta: d,
}));
export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
].map((m, i) => ({ valor: String(i + 1), etiqueta: m }));
