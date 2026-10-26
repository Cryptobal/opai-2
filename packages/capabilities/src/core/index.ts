import type { Capacidad } from "../types";
import { invitationsAccept, invitationsPeek, invitationsRequestNew } from "./aceptar";
import { apikeysCreate, apikeysList, apikeysRevoke } from "./apikeys";
import { auditList, modulesList, usageSummary } from "./consultas";
import { modulesSolicitar } from "./modulos-solicitar";
import {
  bitacoraVerificar,
  platformBitacoraEstado,
  trabajosDelNucleo as trabajosServicios,
} from "./bitacora";
import { consumosPorAgente, consumosPorRecurso, consumosResumen } from "./consumos";
import { geoAutocompletar, geoDetalle, geoGeocodificar, geoMapa, iaProbar } from "./geo-ia";
import { integracionesProbar, platformIntegracionesEstado } from "./integraciones-probar";
import {
  integracionesConfigurar,
  integracionesGet,
  integracionesList,
  integracionesSetSecreto,
} from "./integraciones";
import { capacidadesAgentes, trabajosAgentes } from "./agentes";
import { capacidadesComunicaciones, consumidorComunicaciones } from "./comunicaciones";
import { capacidadesConfig } from "./config";
import { capacidadesCumplimiento } from "./cumplimiento";
import { capacidadesDocumentos, trabajosDocumentos } from "./documentos";
import { capacidadesEmpresa } from "./empresa";
import { capacidadesMaestros } from "./maestros";
import { capacidadesPanel } from "./panel";
import { platformConsumosSummary, platformEventosList } from "./platform-observabilidad";
import { platformTrabajosCancelar, platformTrabajosReintentar } from "./platform-servicios";
import { invitationsList, invitationsRevoke, usersInvite } from "./invitations";
import { me } from "./me";
import { ping } from "./ping";
import { platformTenantsCreate } from "./platform-escritura";
import { platformTenantsSetEstado, platformTenantsUpdate } from "./platform-estado";
import { platformAdminsInvite, platformModulesSet } from "./platform-modulos";
import { platformTenantsGet, platformUsageSummary } from "./platform-tenants";
import { capacidadesPlataforma, platformTenantsList, platformTrabajosList } from "./plataforma";
import { tenantGet, tenantUpdate } from "./tenant";
import { usersList, usersRemove, usersUpdate } from "./users";

/** Capacidades del núcleo (`core.*`) y de plataforma (`platform.*`), Brief 01 sección 7. */
export const capacidadesDelNucleo: readonly Capacidad[] = [
  ping,
  me,
  tenantGet,
  tenantUpdate,
  usersList,
  usersInvite,
  usersUpdate,
  usersRemove,
  invitationsList,
  invitationsRevoke,
  invitationsPeek,
  invitationsAccept,
  invitationsRequestNew,
  modulesList,
  modulesSolicitar,
  apikeysList,
  apikeysCreate,
  apikeysRevoke,
  auditList,
  usageSummary,
  platformTenantsList,
  platformTenantsGet,
  platformTenantsCreate,
  platformTenantsUpdate,
  platformTenantsSetEstado,
  platformModulesSet,
  platformAdminsInvite,
  platformUsageSummary,
  // Brief 02 · servicios del núcleo
  consumosResumen,
  consumosPorAgente,
  consumosPorRecurso,
  bitacoraVerificar,
  platformBitacoraEstado,
  platformTrabajosList,
  platformTrabajosReintentar,
  platformTrabajosCancelar,
  platformEventosList,
  platformConsumosSummary,
  integracionesList,
  integracionesGet,
  integracionesConfigurar,
  integracionesSetSecreto,
  integracionesProbar,
  geoAutocompletar,
  geoDetalle,
  geoGeocodificar,
  geoMapa,
  iaProbar,
  platformIntegracionesEstado,
  ...capacidadesMaestros,
  ...capacidadesPanel,
  ...capacidadesDocumentos,
  ...capacidadesConfig,
  ...capacidadesCumplimiento,
  ...capacidadesEmpresa,
  ...capacidadesComunicaciones,
  ...capacidadesAgentes,
  ...capacidadesPlataforma,
];

/** Consumidores de eventos del núcleo que registra el borde. */
export const consumidoresDelNucleo = [consumidorComunicaciones];

/** Trabajos del núcleo que registra el borde (`apps/web/lib/registro.ts`). */
export const trabajosDelNucleo = [...trabajosServicios, ...trabajosDocumentos, ...trabajosAgentes];
