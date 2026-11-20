import { TODAS } from "./grupos";
import type { CampoDef } from "./tipos";

/** Línea de puesto de la cotización dentro de `{{#cada puestos}}`. */
export const CAMPOS_PUESTO: readonly CampoDef[] = [
  {
    clave: "puesto.nombre",
    descripcion: "Nombre del puesto",
    tipo: "texto",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "Guardia recepción",
  },
  {
    clave: "puesto.turno_horario",
    descripcion: "Patrón, horario y días de cobertura",
    tipo: "texto",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "4×4 · 08:00–20:00 · Lunes a domingo",
  },
  {
    clave: "puesto.cantidad",
    descripcion: "Cantidad de guardias (posiciones)",
    tipo: "numero",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "2",
  },
  {
    clave: "puesto.precio_mensual",
    descripcion: "Precio mensual del puesto (CLP, neto)",
    tipo: "clp",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "1800000",
  },
];