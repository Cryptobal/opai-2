// Capacidades del módulo Pauta (Operaciones, Brief 11b). Se exponen igual en UI, API /api/v1
// y MCP (ADR-004, ADR-055).
import type { Capacidad } from "../types";
import { alertasListar } from "./alertas-listar";
import { ausenciasAnular } from "./ausencias-anular";
import { ausenciasListar } from "./ausencias-listar";
import { ausenciasRegistrar } from "./ausencias-registrar";
import { coberturaConfirmar } from "./cobertura-confirmar";
import { coberturaDeshacer } from "./cobertura-deshacer";
import { excepcionesAnular } from "./excepciones-anular";
import { excepcionesCrear } from "./excepciones-crear";
import { exportarPauta } from "./exportar";
import { historialListar } from "./historial";
import { informeInstalaciones } from "./informe-instalaciones";
import { mesLeer } from "./lectura-mes";
import { ppcListar, resumenLeer } from "./lectura-resumen";
import { marcaManual } from "./marca-manual";
import { publicacionesListar, publicacionesPublicar } from "./publicaciones";
import { reemplazosAsignar } from "./reemplazos-asignar";
import { reemplazosSugerir } from "./reemplazos-sugerir";
import { refuerzosAgregar } from "./refuerzos-agregar";
import { seriesFijar } from "./series";
import { titularAsignar } from "./titular-asignar";
import { titularesListar } from "./titulares-listar";
import { titularTrasladar } from "./titular-trasladar";

export { ajustesPauta } from "./ajustes";
export { buscadoresPauta } from "./buscadores";
export { consumidorPautaCambio } from "./consumidor-cambio";
export { consumidorPautaPublicada } from "./consumidor-publicada";
export { indicadoresPauta } from "./indicadores-gestion";
export { ausenteSinJustificar, diasConTurno, type DiaConTurno, SIGLAS_NEUTRAS, toleranciaAtrasoS } from "./dias-con-turno";
export const capacidadesPauta: readonly Capacidad[] = [
  mesLeer,
  resumenLeer,
  ppcListar,
  informeInstalaciones,
  historialListar,
  seriesFijar,
  titularAsignar,
  titularTrasladar,
  titularesListar,
  excepcionesCrear,
  excepcionesAnular,
  ausenciasListar,
  ausenciasRegistrar,
  ausenciasAnular,
  coberturaConfirmar,
  coberturaDeshacer,
  marcaManual,
  reemplazosSugerir,
  reemplazosAsignar,
  refuerzosAgregar,
  alertasListar,
  exportarPauta,
  publicacionesPublicar,
  publicacionesListar,
];
