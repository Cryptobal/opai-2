// Capacidades del módulo Pauta (Operaciones, Brief 11b). Se exponen igual en UI, API /api/v1
// y MCP (ADR-004, ADR-055).
import type { Capacidad } from "../types";
import { alertasListar } from "./alertas-listar";
import { coberturaConfirmar } from "./cobertura-confirmar";
import { coberturaDeshacer } from "./cobertura-deshacer";
import { excepcionesAnular } from "./excepciones-anular";
import { excepcionesCrear } from "./excepciones-crear";
import { exportarPauta } from "./exportar";
import { historialListar } from "./historial";
import { mesLeer } from "./lectura-mes";
import { ppcListar, resumenLeer } from "./lectura-resumen";
import { marcaManual } from "./marca-manual";
import { reemplazosAsignar } from "./reemplazos-asignar";
import { reemplazosSugerir } from "./reemplazos-sugerir";
import { refuerzosAgregar } from "./refuerzos-agregar";
import { seriesFijar } from "./series";
import { titularAsignar } from "./titular-asignar";
import { titularesListar } from "./titulares-listar";
import { titularTrasladar } from "./titular-trasladar";

export { ajustesPauta } from "./ajustes";
export const capacidadesPauta: readonly Capacidad[] = [
  mesLeer,
  resumenLeer,
  ppcListar,
  historialListar,
  seriesFijar,
  titularAsignar,
  titularTrasladar,
  titularesListar,
  excepcionesCrear,
  excepcionesAnular,
  coberturaConfirmar,
  coberturaDeshacer,
  marcaManual,
  reemplazosSugerir,
  reemplazosAsignar,
  refuerzosAgregar,
  alertasListar,
  exportarPauta,
];
