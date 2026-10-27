import type { ModuleManifest } from "@opai/capabilities";
import { manifest as agente } from "@opai/mod-agente";

/**
 * Registro de módulos vendibles (ADR-003). `pnpm scaffold:module <id>` agrega el import y la entrada.
 * apps/web registra estos manifests al arrancar; de ellos se derivan navegación, permisos,
 * configuración, eventos y capacidades (API y MCP).
 */
export const modulos: readonly ModuleManifest[] = [
  agente,
  // scaffold:module — las entradas se agregan sobre esta línea
];
