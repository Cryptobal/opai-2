// Capacidades de CPQ (CAR-119, ADR-004/ADR-042). Se exponen igual en UI, API /api/v1 y MCP.
import type { Capacidad } from "@opai/capabilities";

import {
  catalogoCategoriasCreate,
  catalogoCategoriasDesactivar,
  catalogoCategoriasList,
  catalogoCategoriasUpdate,
} from "./catalogo";
import {
  catalogoItemsArchivar,
  catalogoItemsCreate,
  catalogoItemsList,
  catalogoItemsUpdate,
} from "./catalogo-items";
import { correlativosFijar } from "./correlativos";
import { costosCategoriaGuardar, costosCategoriaList } from "./costos-categoria";
import { motorSimular } from "./motor";
import { cotizacionesCreate } from "./crear";
import { cotizacionesEnviar } from "./enviar";
import {
  cotizacionesAprobarMargen,
  cotizacionesRechazarAprobacion,
  cotizacionesRetirarAprobacion,
} from "./aprobacion-decidir";
import {
  cpqAprobacionesContar,
  cpqAprobacionesGet,
  cpqAprobacionesList,
} from "./aprobaciones-bandeja";
import {
  cotizacionesMarcarLista,
  cotizacionesReabrir,
  cotizacionesSolicitarAprobacion,
} from "./aprobacion-flujo";
import { cotizacionesCalcular } from "./ficha-calcular";
import { cotizacionesFicha } from "./ficha";
import { cotizacionesExplicar } from "./ficha-explicar";
import { cotizacionesGet, cotizacionesList } from "./lectura";
import { esquemasCoberturaGuardar, esquemasCoberturaList } from "./esquemas-cobertura";
import { lineasActualizar, lineasCrear } from "./lineas";
import { lineasAgregarEsquema } from "./lineas-esquema";
import { lineasQuitar } from "./lineas-quitar";
import { lineasReordenar } from "./lineas-reordenar";
import { marcaDocumentoGet, marcaDocumentoUpdate } from "./marca-documento";
import { seccionMargenActualizar, versionMargenActualizar } from "./margen";
import { versionParametros } from "./parametros";
import { sueldosReferenciaFijar, sueldosReferenciaList } from "./sueldos-referencia";
import {
  cotizacionesPreviewPdf,
  plantillasDocumentoGet,
  plantillasDocumentoUpdate,
} from "./plantillas-documento";
import {
  bibliotecaBloquesList,
  bibliotecaBloquesPublicar,
  enviosPropuestaAprobar,
  enviosPropuestaCancelar,
  enviosPropuestaList,
  enviosPropuestaSolicitar,
  plantillasPropuestaGet,
  plantillasPropuestaUpdate,
  propuestaTecnicaGet,
  propuestaTecnicaInicializar,
  propuestaTecnicaPreviewPdf,
  propuestaTecnicaSyncServicio,
  propuestaTecnicaUpdate,
} from "./propuesta-tecnica";
import { cotizacionesClonar, versionesCrear } from "./versiones";
import { cotizacionesArchivar, cotizacionesRestaurar } from "./archivar";
import { compartirCrear, compartirRevocar } from "./compartir";
import { compartirVer } from "./compartir-ver";
import { cotizacionesEstadoComercial } from "./estado-comercial";
import { puestosConfirmar } from "./puestos-confirmar";
import { puestosOfrecer } from "./puestos-ofrecer";

export const capacidades: readonly Capacidad[] = [
  motorSimular,
  cotizacionesList,
  cotizacionesGet,
  cotizacionesCreate,
  cotizacionesClonar,
  cotizacionesCalcular,
  cotizacionesFicha,
  cotizacionesExplicar,
  cotizacionesSolicitarAprobacion,
  cotizacionesMarcarLista,
  cotizacionesReabrir,
  cotizacionesRetirarAprobacion,
  cotizacionesAprobarMargen,
  cotizacionesRechazarAprobacion,
  cpqAprobacionesList,
  cpqAprobacionesGet,
  cpqAprobacionesContar,
  cotizacionesEnviar,
  cotizacionesPreviewPdf,
  lineasCrear,
  lineasAgregarEsquema,
  esquemasCoberturaList,
  esquemasCoberturaGuardar,
  lineasActualizar,
  lineasQuitar,
  lineasReordenar,
  costosCategoriaList,
  costosCategoriaGuardar,
  versionMargenActualizar,
  seccionMargenActualizar,
  versionParametros,
  sueldosReferenciaList,
  sueldosReferenciaFijar,
  versionesCrear,
  correlativosFijar,
  catalogoCategoriasList,
  catalogoCategoriasCreate,
  catalogoCategoriasUpdate,
  catalogoCategoriasDesactivar,
  catalogoItemsList,
  catalogoItemsCreate,
  catalogoItemsUpdate,
  catalogoItemsArchivar,
  marcaDocumentoGet,
  marcaDocumentoUpdate,
  plantillasDocumentoGet,
  plantillasDocumentoUpdate,
  bibliotecaBloquesList,
  bibliotecaBloquesPublicar,
  plantillasPropuestaGet,
  plantillasPropuestaUpdate,
  propuestaTecnicaGet,
  propuestaTecnicaInicializar,
  propuestaTecnicaUpdate,
  propuestaTecnicaSyncServicio,
  propuestaTecnicaPreviewPdf,
  enviosPropuestaList,
  enviosPropuestaSolicitar,
  enviosPropuestaAprobar,
  enviosPropuestaCancelar,
  cotizacionesEstadoComercial,
  cotizacionesArchivar,
  cotizacionesRestaurar,
  compartirCrear,
  compartirRevocar,
  compartirVer,
  puestosOfrecer,
  puestosConfirmar,
];
