// Capacidades del módulo Comercial (Brief 07 · PR 1 y PR 1b). Se exponen igual en UI, API /api/v1 y MCP
// (ADR-004). El manifest de modules/comercial las lista; el registro las da de alta al arrancar.
import type { Capacidad } from "../types";
import { configCrearEtapa, configReordenarEtapas } from "./config-embudo";
import { configActualizarEtapa, configGuardarCatalogo } from "./config-escritura";
import { configGet } from "./config";
import { contactosList } from "./contactos";
import { negociosArchivar, negociosPerder, negociosReabrir } from "./negocios-cierre";
import { negociosUpdate } from "./negocios-editar";
import { negociosCreate } from "./negocios-escritura";
import { negociosGet } from "./negocios-ficha";
import { negociosAlertas } from "./negocios-alertas";
import { informesCierre } from "./informes-cierre";
import { informesPerdidosPorMotivo } from "./informes-perdidos";
import { informesTablero } from "./informes-tablero";
import { negociosEmbudo } from "./negocios-embudo";
import { negociosList } from "./negocios-lectura";
import { negociosGanar, negociosMover } from "./negocios-mover";
import { negociosSetContactos } from "./negocios-contactos";
import { comercialImportar10 } from "./importar-1-0";
import { solicitudesAccionesAgente } from "./solicitudes-acciones-agente";
import { solicitudesBuscarDuplicadas } from "./solicitudes-buscar-duplicadas";
import { canalesGet, canalesUpdate } from "./solicitudes-canales";
import {
  canalesRotarTokenFormulario,
  solicitudesRecibirFormularioWeb,
} from "./solicitudes-formulario-web";
import { solicitudesConvertir } from "./solicitudes-convertir";
import { solicitudesEnriquecer } from "./solicitudes-enriquecer";
import { solicitudesPasarACotizacion } from "./solicitudes-pasar-cotizacion";
import { solicitudesCreate } from "./solicitudes-crear";
import {
  solicitudesDerivar,
  solicitudesDescartar,
  solicitudesMarcarDuplicada,
  solicitudesReabrir,
} from "./solicitudes-estado";
import { solicitudesGet, solicitudesList } from "./solicitudes-lectura";
import { capacidadesSeguimiento } from "./seguimiento-index";
import { negociosDesvincularInstalacion, negociosVincularInstalacion } from "./negocios-vinculos";

export { ajustesComercial } from "./ajustes";

import { contextoAgregar, contextoListar } from "./contexto-negocio";
import { contextoArchivar, contextoConfirmar } from "./contexto-negocio-estado";
import { contextoSugerirSeccion } from "./contexto-sugerir";

export const capacidadesComercial: readonly Capacidad[] = [
  negociosList,
  negociosGet,
  negociosEmbudo,
  negociosAlertas,
  informesCierre,
  informesPerdidosPorMotivo,
  informesTablero,
  contactosList,
  negociosCreate,
  negociosUpdate,
  negociosMover,
  negociosGanar,
  negociosPerder,
  negociosReabrir,
  negociosArchivar,
  negociosVincularInstalacion,
  negociosDesvincularInstalacion,
  negociosSetContactos,
  contextoListar,
  contextoAgregar,
  contextoConfirmar,
  contextoArchivar,
  contextoSugerirSeccion,
  configGet,
  configActualizarEtapa,
  configGuardarCatalogo,
  configCrearEtapa,
  configReordenarEtapas,
  solicitudesList,
  solicitudesGet,
  solicitudesCreate,
  solicitudesEnriquecer,
  solicitudesBuscarDuplicadas,
  solicitudesAccionesAgente,
  solicitudesDerivar,
  solicitudesDescartar,
  solicitudesReabrir,
  solicitudesMarcarDuplicada,
  solicitudesConvertir,
  solicitudesPasarACotizacion,
  canalesGet,
  canalesUpdate,
  canalesRotarTokenFormulario,
  solicitudesRecibirFormularioWeb,
  comercialImportar10,
  ...capacidadesSeguimiento,
];
