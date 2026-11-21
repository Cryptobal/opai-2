import type { Capacidad } from "../types";
import { invitationsAccept, invitationsPeek, invitationsRequestNew } from "./aceptar";
import { capacidadesPush } from "./push";
import { apikeysCreate, apikeysList, apikeysRevoke } from "./apikeys";
import { auditList, modulesList, usageSummary } from "./consultas";
import { capacidadesModulos } from "./modulos-acciones";
import { bitacoraVerificar, platformBitacoraEstado } from "./bitacora";
import { platformAuditoriaEstado } from "./auditoria";
import { consumosPorAgente, consumosPorRecurso, consumosResumen } from "./consumos";
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
import { platformTenantsSetModulosNuevos } from "./modulos-nuevos";
import { platformTenantsGet } from "./platform-tenants";
import {
  platformInvitacionesReenviar,
  platformInvitacionesRevocar,
  platformTenantsMiembros,
} from "./plataforma/miembros";
import { platformTenantsList, platformTrabajosList } from "./plataforma";
import { tenantGet, tenantUpdate } from "./tenant";
import { usersList, usersRemove, usersUpdate } from "./users";
import { usersRestablecerMfa } from "./users-mfa";
import { seguridadMetodos, seguridadPasskeysRenombrar } from "./seguridad/metodos";
import { seguridadMetodosQuitar } from "./seguridad/quitar";
import { appsConectadasDesconectar, appsConectadasList } from "./seguridad/apps";
import { verComoIniciar, verComoTerminar } from "./ver-como/capacidades";
import { verComoList } from "./ver-como/objetivos";

/** Primera mitad del registro `core.*` / `platform.*` (Brief 01 §7). */
export const capacidadesDelNucleoA: readonly Capacidad[] = [
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
  seguridadMetodos,
  seguridadPasskeysRenombrar,
  seguridadMetodosQuitar,
  appsConectadasList,
  appsConectadasDesconectar,
  verComoIniciar,
  verComoTerminar,
  verComoList,
  invitationsList,
  invitationsRevoke,
  invitationsPeek,
  invitationsAccept,
  invitationsRequestNew,
  ...capacidadesPush,
  modulesList,
  ...capacidadesModulos,
  apikeysList,
  apikeysCreate,
  apikeysRevoke,
  auditList,
  usageSummary,
  platformTenantsList,
  platformTenantsGet,
  platformTenantsMiembros,
  platformInvitacionesRevocar,
  platformInvitacionesReenviar,
  ...capacidadesTenantsEscritura,
  platformTenantsUpdate,
  platformTenantsSetEstado,
  platformTenantsSetModulosNuevos,
  platformModulesSet,
  platformAdminsInvite,
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
];