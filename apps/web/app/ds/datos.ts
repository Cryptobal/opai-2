import type { Celda, ColumnaPlanilla, FilaPlanilla, Kpi } from "@opai/ds";

export type Persona = {
  id: string;
  nombre: string;
  rut: string;
  cargo: string;
  instalacion: string;
  estado: "Activa" | "Licencia" | "Finiquitada";
  ingreso: string;
};

const NOMBRES = [
  "María Fernanda Soto",
  "José Antonio Pérez",
  "Camila Andrea Rojas",
  "Luis Alberto Muñoz",
  "Daniela Paz González",
  "Cristian Eduardo Díaz",
];
const INSTALACIONES = ["Edificio Costanera Center", "Planta Quilicura", "Bodega Pudahuel", "Clínica Las Condes"];
const CARGOS = ["Guardia", "Supervisor", "Operador CCTV"];
const ESTADOS: Persona["estado"][] = ["Activa", "Activa", "Activa", "Licencia", "Finiquitada"];

export const PERSONAS: Persona[] = Array.from({ length: 24 }, (_, i) => ({
  id: `p${i + 1}`,
  nombre: NOMBRES[i % NOMBRES.length] as string,
  rut: `${16_234_567 + i * 1_013}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + `-${(i * 7) % 10}`,
  cargo: CARGOS[i % CARGOS.length] as string,
  instalacion: INSTALACIONES[i % INSTALACIONES.length] as string,
  estado: ESTADOS[i % ESTADOS.length] as Persona["estado"],
  ingreso: `0${(i % 9) + 1}-0${(i % 8) + 1}-202${4 + (i % 2)}`,
}));

export const KPIS: Kpi[] = [
  { etiqueta: "Saldo banco", valor: "$ 48.300.000", variacion: { texto: "+4,2% vs. septiembre", tono: "success" } },
  { etiqueta: "Por cobrar", valor: "$ 112.450.000", variacion: { texto: "12 facturas", tono: "neutro" } },
  { etiqueta: "Por pagar", valor: "$ 63.200.000", variacion: { texto: "-2,1% vs. septiembre", tono: "success" } },
  { etiqueta: "Flujo 30 días", valor: "+$ 9.100.000", variacion: { texto: "proyección", tono: "neutro" } },
];

export const FILAS_PAUTA: FilaPlanilla[] = [
  { id: "f1", etiqueta: "Portería principal · Día", sub: "M. F. Soto" },
  { id: "f2", etiqueta: "Portería principal · Noche", sub: "J. A. Pérez" },
  { id: "f3", etiqueta: "Ronda perimetral", sub: "C. A. Rojas" },
  { id: "f4", etiqueta: "CCTV", sub: "L. A. Muñoz" },
  { id: "f5", etiqueta: "Acceso camiones", sub: "D. P. González" },
];

export const COLUMNAS_PAUTA: ColumnaPlanilla[] = Array.from({ length: 30 }, (_, i) => ({
  id: `d${i + 1}`,
  etiqueta: String(i + 1),
  destacada: i + 1 === 12,
}));

const CODIGOS: Celda[] = [
  { texto: "D", tono: "info", detalle: "Turno día 08:00–20:00" },
  { texto: "N", tono: "accent", detalle: "Turno noche 20:00–08:00" },
  { texto: "L", tono: "neutro", detalle: "Libre" },
  { texto: "V", tono: "warning", detalle: "Vacaciones" },
];

export function celdaPauta(filaId: string, columnaId: string): Celda | null {
  const f = Number(filaId.slice(1));
  const d = Number(columnaId.slice(1));
  if (f === 4 && d % 7 === 0) return null;
  const patron = (f * 3 + d) % 8;
  return patron < 4 ? (CODIGOS[0] as Celda) : patron < 6 ? (CODIGOS[1] as Celda) : patron === 6 ? (CODIGOS[2] as Celda) : (CODIGOS[3] as Celda);
}
