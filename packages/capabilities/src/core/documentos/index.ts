import type { Capacidad } from "../../types";
import { documentosConfirmarSubida } from "./confirmar";
import { documentosGet, documentosList } from "./consulta";
import { documentosExplorar } from "./explorar";
import { documentosMatriz } from "./matriz";
import { documentosPedirRenovacion } from "./renovacion";
import { documentosArchive, documentosUpdate, documentosUrlDescarga } from "./gestion";
import { documentosIniciarSubida } from "./subida";
import { documentoTiposCreate, documentoTiposList, documentoTiposUpdate } from "./tipos";
import { documentosVencimientos } from "./vencimientos";
import { documentosDesvincular, documentosVincular } from "./vinculos";

export { trabajosDocumentos } from "./trabajos";

/** Documentos del núcleo (Brief 02, bloque 7; ADR-019 y ADR-039). */
export const capacidadesDocumentos: readonly Capacidad[] = [
  documentoTiposList,
  documentoTiposCreate,
  documentoTiposUpdate,
  documentosIniciarSubida,
  documentosConfirmarSubida,
  documentosList,
  documentosExplorar,
  documentosGet,
  documentosUpdate,
  documentosVincular,
  documentosDesvincular,
  documentosArchive,
  documentosUrlDescarga,
  documentosVencimientos,
  documentosMatriz,
  documentosPedirRenovacion,
];
