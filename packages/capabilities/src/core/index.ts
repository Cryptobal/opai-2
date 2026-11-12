/* eslint-disable max-lines -- registro único del núcleo: una línea por capacidad y consumidor (CAR-78 B4 suma biometría) */
import type { Capacidad } from "../types";
import { invitationsAccept, invitationsPeek, invitationsRequestNew } from "./aceptar";
import { capacidadesAnexos, consumidorAnexos } from "./anexos";
import { capacidadesCampos } from "./campos";
import { consumidorRevocacionBiometria } from "./biometria";
import { apikeysCreate, apikeysList, apikeysRevoke } from "./apikeys";
import { auditList, modulesList, usageSummary } from "./consultas";
import { capacidadesModulos } from "./modulos-acciones";
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
import { capacidadesSlack } from "./slack";
import { capacidadesAgentes, trabajosAgentes } from "./agentes";
import { capacidadesCalendario } from "./calendario";
import {
  capacidadesRemuneraciones, trabajoCapturaIndicadoresSii, trabajoCapturaPrevisional,
} from "./remuneraciones";
import { capacidadesComunicaciones, consumidorComunicaciones } from "./comunicaciones";
import { capacidadesNovedades } from "./novedades";
import { capacidadesConfig } from "./config";
import { capacidadesCumplimiento, trabajosCumplimiento } from "./cumplimiento";
import { capacidadesDocumentos, trabajosDocumentos } from "./documentos";
import { consumidorSeguimientoAviso } from "../comercial/seguimiento-aviso";
import { consumidoresPausaSeguimiento } from "../comercial/seguimiento-pausas";
import { consumidorTareaVencida, trabajoTareasVencidas } from "./crm/actividades-vencidas";
import { capacidadesEmpresa } from "./empresa";
import { capacidadesFirmas, consumidorFirmaDocumento } from "./firmas";
import { consumidorSolicitudCreada } from "../comercial/consumidor-solicitud";
import { consumidorNegocioGanado } from "../comercial/consumidor-ganado";
import { consumidorCpqGanado } from "../comercial/consumidor-ganado-cpq";
import { capacidadesCorreos } from "./correos";
import { capacidadesImportar } from "./importar";
import { capacidadesCrm } from "./crm";
import { capacidadesMaestros, trabajosMaestros } from "./maestros";
import { capacidadesPanel } from "./panel";
import { capacidadesGrupos } from "./grupos";
import { capacidadesIndicadoresGestion } from "./indicadores-gestion";
import { capacidadesPermisos } from "./permisos";
import { platformConsumosSummary, platformEventosList } from "./platform-observabilidad";
import { platformTrabajosCancelar, platformTrabajosReintentar } from "./platform-servicios";
import { invitationsList, invitationsRevoke, usersInvite } from "./invitations";
import { me } from "./me";
import { mePortalInicio } from "./portal-inicio";
import { indicadoresUfUtm } from "./indicadores-uf-utm";
import { ping } from "./ping";
import { capacidadesTenantsEscritura } from "./platform-escritura";
import { platformTenantsSetEstado, platformTenantsUpdate } from "./platform-estado";
import { platformAdminsInvite, platformModulesSet } from "./platform-modulos";
import { platformTenantsGet, platformUsageSummary } from "./platform-tenants";
import { capacidadesPlataforma, platformTenantsList, platformTrabajosList } from "./plataforma";
import { tenantGet, tenantUpdate } from "./tenant";
import { usersList, usersRemove, usersUpdate } from "./users";
import { usersRestablecerMfa } from "./users-mfa";
import { capacidadesTurnos, consumidorTurnosEsperados, trabajoExtenderTurnos } from "./turnos";

/** Capacidades del núcleo (`core.*`) y de plataforma (`platform.*`), Brief 01 sección 7. */
export const capacidadesDelNucleo: readonly Capacidad[] = [
  ping,
  indicadoresUfUtm,
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
  ...capacidadesModulos,
  apikeysList,
  apikeysCreate,
  apikeysRevoke,
  auditList,
  usageSummary,
  platformTenantsList,
  platformTenantsGet,
  ...capacidadesTenantsEscritura,
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
  ...capacidadesCorreos,
  ...capacidadesImportar,
  ...capacidadesCalendario,
  ...capacidadesRemuneraciones,
  ...capacidadesAnexos,
  ...capacidadesCampos,
  ...capacidadesPanel,
  ...capacidadesPermisos,
  ...capacidadesGrupos,
  ...capacidadesSlack,
  ...capacidadesIndicadoresGestion,
  ...capacidadesDocumentos,
  ...capacidadesFirmas,
  ...capacidadesConfig,
  ...capacidadesCumplimiento,
  ...capacidadesEmpresa,
  ...capacidadesComunicaciones,
  ...capacidadesNovedades,
  ...capacidadesAgentes, ...capacidadesTurnos,
  ...capacidadesPlataforma,
];

/** Consumidores de eventos del núcleo que registra el borde. */
export const consumidoresDelNucleo = [
  consumidorComunicaciones,
  consumidorAnexos,
  consumidorFirmaDocumento,
  consumidorSolicitudCreada,
  consumidorTareaVencida,
  consumidorSeguimientoAviso,
  ...consumidoresPausaSeguimiento,
  consumidorNegocioGanado,
  consumidorCpqGanado, consumidorTurnosEsperados,
  consumidorRevocacionBiometria,
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
  trabajoCapturaPrevisional,
  trabajoTareasVencidas, trabajoExtenderTurnos,
];
