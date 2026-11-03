import type { Capacidad } from "../types";
import { invitationsAccept, invitationsPeek, invitationsRequestNew } from "./aceptar";
import { capacidadesAnexos, consumidorAnexos } from "./anexos";
import { apikeysCreate, apikeysList, apikeysRevoke } from "./apikeys";
import { auditList, modulesList, usageSummary } from "./consultas";
import { modulesSolicitar } from "./modulos-solicitar";
import {
  bitacoraVerificar,
  platformBitacoraEstado,
  trabajosDelNucleo as trabajosServicios,
} from "./bitacora";
import { platformAuditoriaEstado, trabajoVerificarAuditoria } from "./auditoria";
import { consumosPorAgente, consumosPorRecurso, consumosResumen } from "./consumos";
import { geoAutocompletar, geoDetalle, geoGeocodificar, geoMapa, iaProbar } from "./geo-ia";
import { integracionesProbar, platformIntegracionesEstado } from "./integraciones-probar";
import {
  integracionesConfigurar,
  integracionesGet,
  integracionesList,
  integracionesSetSecreto,
} from "./integraciones";
import { integracionesGuardarCertificadoDte } from "./integraciones-certificado-dte";
import { capacidadesAgentes, trabajosAgentes } from "./agentes";
import { capacidadesCalendario } from "./calendario";
import { capacidadesRemuneraciones, trabajoCapturaIndicadoresSii } from "./remuneraciones";
import { capacidadesComunicaciones, consumidorComunicaciones } from "./comunicaciones";
import { capacidadesConfig } from "./config";
import { capacidadesCumplimiento, trabajosCumplimiento } from "./cumplimiento";
import { capacidadesDocumentos, trabajosDocumentos } from "./documentos";
import { capacidadesEmpresa } from "./empresa";
import { capacidadesFirmas, consumidorFirmaDocumento } from "./firmas";
import { consumidorSolicitudCreada } from "../comercial/consumidor-solicitud";
import { consumidorNegocioGanado } from "../comercial/consumidor-ganado";
import { capacidadesCrm } from "./crm";
import { capacidadesMaestros, trabajosMaestros } from "./maestros";
import { capacidadesPanel } from "./panel";
import { capacidadesPermisos } from "./permisos";
import { platformConsumosSummary, platformEventosList } from "./platform-observabilidad";
import { platformTrabajosCancelar, platformTrabajosReintentar } from "./platform-servicios";
import { invitationsList, invitationsRevoke, usersInvite } from "./invitations";
import { me } from "./me";
import { mePortalInicio } from "./portal-inicio";
import { ping } from "./ping";
import { platformTenantsCreate } from "./platform-escritura";
import { platformTenantsSetEstado, platformTenantsUpdate } from "./platform-estado";
import { platformAdminsInvite, platformModulesSet } from "./platform-modulos";
import { platformTenantsGet, platformUsageSummary } from "./platform-tenants";
import { capacidadesPlataforma, platformTenantsList, platformTrabajosList } from "./plataforma";
import { tenantGet, tenantUpdate } from "./tenant";
import { usersList, usersRemove, usersUpdate } from "./users";
import { usersRestablecerMfa } from "./users-mfa";

/** Capacidades del núcleo (`core.*`) y de plataforma (`platform.*`), Brief 01 sección 7. */
export const capacidadesDelNucleo: readonly Capacidad[] = [
  ping,
  me,
  mePortalInicio,
  tenantGet,
  tenantUpdate,
  usersList,
  usersInvite,
  usersUpdate,
  usersRemove,
  usersRestablecerMfa,
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
  platformAuditoriaEstado,
  platformTrabajosList,
  platformTrabajosReintentar,
  platformTrabajosCancelar,
  platformEventosList,
  platformConsumosSummary,
  integracionesList,
  integracionesGet,
  integracionesConfigurar,
  integracionesSetSecreto,
  integracionesGuardarCertificadoDte,
  integracionesProbar,
  geoAutocompletar,
  geoDetalle,
  geoGeocodificar,
  geoMapa,
  iaProbar,
  platformIntegracionesEstado,
  ...capacidadesMaestros,
  ...capacidadesCrm,
  ...capacidadesCalendario,
  ...capacidadesRemuneraciones,
  ...capacidadesAnexos,
  ...capacidadesPanel,
  ...capacidadesPermisos,
  ...capacidadesDocumentos,
  ...capacidadesFirmas,
  ...capacidadesConfig,
  ...capacidadesCumplimiento,
  ...capacidadesEmpresa,
  ...capacidadesComunicaciones,
  ...capacidadesAgentes,
  ...capacidadesPlataforma,
];

/** Consumidores de eventos del núcleo que registra el borde. */
export const consumidoresDelNucleo = [
  consumidorComunicaciones,
  consumidorAnexos,
  consumidorFirmaDocumento,
  consumidorSolicitudCreada,
  consumidorNegocioGanado,
];

/** Trabajos del núcleo que registra el borde (`apps/web/lib/registro.ts`). */
export const trabajosDelNucleo = [
  ...trabajosServicios,
  trabajoVerificarAuditoria,
  ...trabajosDocumentos,
  ...trabajosAgentes,
  ...trabajosCumplimiento,
  ...trabajosMaestros,
  trabajoCapturaIndicadoresSii,
];
