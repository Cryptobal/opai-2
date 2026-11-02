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
import { motorSimular } from "./motor";
import { cotizacionesCreate } from "./crear";
import { cotizacionesEnviar } from "./enviar";
import {
  cotizacionesAprobarMargen,
  cotizacionesRechazarAprobacion,
  cotizacionesRetirarAprobacion,
} from "./aprobacion-decidir";
import { cotizacionesMarcarLista, cotizacionesSolicitarAprobacion } from "./aprobacion-flujo";
import { cotizacionesCalcular } from "./ficha-calcular";
import { cotizacionesFicha } from "./ficha";
import { cotizacionesExplicar } from "./ficha-explicar";
import { cotizacionesGet, cotizacionesList } from "./lectura";
import { lineasActualizar, lineasCrear, lineasQuitar } from "./lineas";
import { lineasReordenar } from "./lineas-reordenar";
import { marcaDocumentoGet, marcaDocumentoUpdate } from "./marca-documento";
import { seccionMargenActualizar, versionMargenActualizar } from "./margen";
import {
  cotizacionesPreviewPdf,
  plantillasDocumentoGet,
  plantillasDocumentoUpdate,
} from "./plantillas-documento";
import { cotizacionesClonar, versionesCrear } from "./versiones";

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
  cotizacionesRetirarAprobacion,
  cotizacionesAprobarMargen,
  cotizacionesRechazarAprobacion,
  cotizacionesEnviar,
  cotizacionesPreviewPdf,
  lineasCrear,
  lineasActualizar,
  lineasQuitar,
  lineasReordenar,
  versionMargenActualizar,
  seccionMargenActualizar,
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
];
