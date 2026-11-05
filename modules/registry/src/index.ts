import type { ModuleManifest } from "@opai/capabilities";

import { manifest as Asistencia } from "@opai/mod-asistencia";

import { manifest as Rendiciones } from "@opai/mod-rendiciones";

import { manifest as PortalTrabajador } from "@opai/mod-portal_trabajador";
import { manifest as Cpq } from "@opai/mod-cpq";

import { manifest as Nomina } from "@opai/mod-nomina";
import { manifest as Pauta } from "@opai/mod-pauta";
import { manifest as PortalCliente } from "@opai/mod-portal_cliente";
import { manifest as Finanzas } from "@opai/mod-finanzas";
import { manifest as Tickets } from "@opai/mod-tickets";

import { manifest as Rondas } from "@opai/mod-rondas";
import { manifest as agente } from "@opai/mod-agente";

import { manifest as Comercial } from "@opai/mod-comercial";

export { trabajosAgente } from "@opai/mod-agente/trabajos";
export { trabajosAsistencia } from "@opai/mod-asistencia/trabajos";
export { consumidorCpqBandeja } from "@opai/mod-cpq/consumidor-bandeja";
export { consumidorCpqEnlace } from "@opai/mod-cpq/consumidor-enlace";
export { trabajosCpq } from "@opai/mod-cpq/trabajos";

/**
 * Registro de módulos vendibles (ADR-003). `pnpm scaffold:module <id>` agrega el import y la entrada.
 * apps/web registra estos manifests al arrancar; de ellos se derivan navegación, permisos,
 * configuración, eventos y capacidades (API y MCP).
 */
export const modulos: readonly ModuleManifest[] = [
  agente,
  Comercial,
  Rondas,
  PortalTrabajador,
  Nomina,
  Pauta,
  PortalCliente,
  Finanzas,
  Tickets,
  Cpq,
  Rendiciones,
  Asistencia,
  // scaffold:module — las entradas se agregan sobre esta línea
];
