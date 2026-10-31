import type { ModuleManifest } from "@opai/capabilities";

import { manifest as Tickets } from "@opai/mod-tickets";

import { manifest as Rondas } from "@opai/mod-rondas";
import { manifest as agente } from "@opai/mod-agente";

import { manifest as Comercial } from "@opai/mod-comercial";

/**
 * Registro de módulos vendibles (ADR-003). `pnpm scaffold:module <id>` agrega el import y la entrada.
 * apps/web registra estos manifests al arrancar; de ellos se derivan navegación, permisos,
 * configuración, eventos y capacidades (API y MCP).
 */
export const modulos: readonly ModuleManifest[] = [
  agente,
  Comercial,
  Rondas,
  Tickets,
  // scaffold:module — las entradas se agregan sobre esta línea
];
