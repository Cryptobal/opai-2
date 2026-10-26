// Capacidades del módulo Comercial (Brief 07 · PR 1). Se exponen igual en UI, API /api/v1 y MCP
// (ADR-004). El manifest de modules/comercial las lista; el registro las da de alta al arrancar.
import type { Capacidad } from "../types";
import { configActualizarEtapa, configGuardarCatalogo } from "./config-escritura";
import { configGet } from "./config";
import { negociosArchivar, negociosPerder, negociosReabrir } from "./negocios-cierre";
import { negociosCreate, negociosUpdate } from "./negocios-escritura";
import { negociosGet } from "./negocios-ficha";
import { negociosEmbudo, negociosList } from "./negocios-lectura";
import { negociosGanar, negociosMover } from "./negocios-mover";
import {
  negociosDesvincularInstalacion,
  negociosSetContactos,
  negociosVincularInstalacion,
} from "./negocios-vinculos";

export const capacidadesComercial: readonly Capacidad[] = [
  negociosList,
  negociosGet,
  negociosEmbudo,
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
  configGet,
  configActualizarEtapa,
  configGuardarCatalogo,
];
