// Roles y permisos (ADR-016). Permisos con formato `<modulo>:<accion>`; los roles se expresan con
// patrones con comodín (`*`) y una lista de denegaciones que siempre gana. Lógica pura.

export const ROLES = ["owner", "admin", "gerente", "supervisor", "viewer"] as const;
export type Rol = (typeof ROLES)[number];

export const ROLES_PLATAFORMA = ["owner", "support"] as const;
export type RolPlataforma = (typeof ROLES_PLATAFORMA)[number];

export { PERMISOS_CORE, PERMISOS_PLATAFORMA } from "./permisos-catalogo";
import { PERMISOS_CORE } from "./permisos-catalogo";

type Patrones = { permitir: readonly string[]; denegar: readonly string[] };

/** Bloqueo financiero heredado de 1.0 (`applyFinancialRoleLock`): solo owner y admin. */
const FINANCIERO = ["finanzas:*", "nomina:*"] as const;

export const PATRONES_POR_ROL: Readonly<Record<Rol, Patrones>> = {
  owner: { permitir: ["*"], denegar: [] },
  admin: {
    permitir: ["*"],
    denegar: [
      PERMISOS_CORE.tenantDelete,
      PERMISOS_CORE.ownersManage,
      // Aceptar el DPA es acto del owner (responsable del tratamiento, §16.1): admin no puede.
      PERMISOS_CORE.cumplimientoDpaAceptar,
    ],
  },
  gerente: {
    permitir: ["*"],
    denegar: [
      ...FINANCIERO,
      PERMISOS_CORE.tenantManage,
      PERMISOS_CORE.tenantDelete,
      PERMISOS_CORE.usersManage,
      PERMISOS_CORE.ownersManage,
      PERMISOS_CORE.apikeysManage,
      // Sueldos, configuración del tenant, integraciones y control de agentes: owner y admin.
      PERMISOS_CORE.vinculosManage,
      PERMISOS_CORE.estructurasManage,
      PERMISOS_CORE.estructurasReadSensible,
      // P1 "No recontratar": solo owner y admin (RRHH la obtiene si se la agregan a su rol).
      PERMISOS_CORE.personasNoRecontratarManage,
      // Anexo de contrato (Brief 07b PR 4, D8): sus snapshots traen datos de sueldo.
      PERMISOS_CORE.anexosRead,
      PERMISOS_CORE.anexosManage,
      PERMISOS_CORE.configManage,
      // Firma (firma.md §8): configurar la política y registrar el finiquito son de owner/admin.
      // Enviar a firma «según tipo» lo conserva (el bloqueo de sueldos corta contratos y anexos).
      PERMISOS_CORE.firmasConfig,
      PERMISOS_CORE.finiquitosManage,
      // Embudo y catálogos de Comercial (comercial.md §7): owner y admin.
      "comercial:config.manage",
      // Canales de entrada de Leads (BRIEF-07-leads): configurarlos es de owner y admin.
      "comercial:canales.manage",
      PERMISOS_CORE.marcaManage,
      PERMISOS_CORE.integracionesManage,
      PERMISOS_CORE.comunicacionesManage,
      PERMISOS_CORE.aprobacionesManage,
      PERMISOS_CORE.agentesManage,
      "agente:configurar",
      // Cumplimiento (DPA/DPO, Ley 21.719): fijar el DPO es de owner/admin; aceptar el DPA, solo owner.
      PERMISOS_CORE.cumplimientoManage,
      PERMISOS_CORE.cumplimientoDpaAceptar,
      // Calendario (CAR-79): gestionar los feriados del tenant es de owner y admin; gerente solo ve.
      PERMISOS_CORE.calendarioManage,
      // Tickets (CAR-84): configurar los tipos del tenant es de owner y admin, igual que los
      // catálogos de Comercial y Rondas.
      "tickets:tipos.manage",
    ],
  },
  supervisor: {
    permitir: [
      "ops:*",
      "rondas:*",
      "asistencia:*",
      // Tickets (CAR-84): el supervisor gestiona tickets y aprueba las solicitudes de los tipos que
      // lo nombran aprobador, en su portal; el alcance por fila lo aplica cada capacidad, no este permiso.
      "tickets:*",
      "personas:read",
      "personas:*.read",
      PERMISOS_CORE.tenantRead,
      PERMISOS_CORE.cuentasRead,
      PERMISOS_CORE.instalacionesRead,
      // Puestos (Brief 11): el supervisor lee los catálogos de patrones y funciones para ver
      // los puestos de su instalación, pero no los edita ni los desactiva.
      PERMISOS_CORE.patronesRead,
      PERMISOS_CORE.funcionesRead,
      PERMISOS_CORE.vinculosRead,
      PERMISOS_CORE.personasRead,
      PERMISOS_CORE.documentosRead,
      // Firma (firma.md §8): el supervisor envía actas en terreno y lee el estado en su alcance; la
      // clase (solo actas) y el alcance por instalación se aplican en la consulta de la capacidad.
      PERMISOS_CORE.firmasEnviar,
      PERMISOS_CORE.firmasRead,
      PERMISOS_CORE.configRead,
      // Calendario (CAR-79): el supervisor ve los feriados para planificar, pero no los gestiona.
      PERMISOS_CORE.calendarioRead,
    ],
    denegar: [...FINANCIERO, "comercial:*", "cpq:*", "tickets:tipos.manage"],
  },
  viewer: {
    permitir: [
      "*:read",
      "*:*.read",
      // Tickets (CAR-84): «cualquier persona con cuenta crea y ve sus tickets» (modulos/tickets.md
      // §2). El alcance (propios, asignados) lo aplica cada capacidad, no este permiso.
      "tickets:tickets.ver",
      "tickets:tickets.gestionar",
    ],
    // Cumplimiento (Ley 21.719): consentimientos, solicitudes ARCO, incidentes/brechas y la
    // exportación del titular traen datos personales sensibles (RUT, domicilio, contacto). No son
    // para el rol de solo lectura más amplio: leerlos exige `cumplimiento.read`, que viewer no tiene.
    denegar: [
      ...FINANCIERO,
      PERMISOS_CORE.consumosRead,
      PERMISOS_CORE.auditRead,
      PERMISOS_CORE.cumplimientoRead,
      // Anexo de contrato (Brief 07b PR 4): sus snapshots traen datos de sueldo (bloqueo financiero).
      PERMISOS_CORE.anexosRead,
      // Solicitudes de Leads (BRIEF-07-leads): traen datos de contacto de terceros; viewer no accede.
      "comercial:solicitudes.read",
    ],
  },
};

const PATRONES_PLATAFORMA: Readonly<Record<RolPlataforma, readonly string[]>> = {
  owner: ["platform:*"],
  support: ["platform:*.read"],
};

const cache = new Map<string, RegExp>();

/** `*` coincide con cualquier secuencia de caracteres; el resto es literal. */
export function coincide(patron: string, permiso: string): boolean {
  let re = cache.get(patron);
  if (!re) {
    const cuerpo = patron
      .split("*")
      .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    re = new RegExp(`^${cuerpo}$`);
    cache.set(patron, re);
  }
  return re.test(permiso);
}

export function esRol(valor: string): valor is Rol {
  return (ROLES as readonly string[]).includes(valor);
}

export function esRolPlataforma(valor: string | null | undefined): valor is RolPlataforma {
  return valor != null && (ROLES_PLATAFORMA as readonly string[]).includes(valor);
}

export function moduloDe(permiso: string): string {
  return permiso.split(":")[0] ?? "";
}

/**
 * Si un rol del tenant tiene el permiso. Los permisos `platform:*` nunca se obtienen por un rol
 * del tenant (ni siquiera owner): solo por `platformRole`.
 */
export function tienePermiso(rol: Rol, permiso: string): boolean {
  if (moduloDe(permiso) === "platform") return false;
  const { permitir, denegar } = PATRONES_POR_ROL[rol];
  if (denegar.some((p) => coincide(p, permiso))) return false;
  return permitir.some((p) => coincide(p, permiso));
}

/** Si el rol de plataforma tiene el permiso. Solo cubre permisos `platform:*`. */
export function tienePermisoPlataforma(
  rol: RolPlataforma | null | undefined,
  permiso: string,
): boolean {
  if (!rol || moduloDe(permiso) !== "platform") return false;
  return PATRONES_PLATAFORMA[rol].some((p) => coincide(p, permiso));
}

/**
 * Permisos efectivos de un rol dentro de un catálogo, solo de módulos activos
 * (`core` siempre está activo). Para `core.me` y la navegación.
 */
export function permisosDe(
  rol: Rol,
  catalogo: readonly string[],
  modulosActivos: readonly string[],
): string[] {
  const activos = new Set(["core", ...modulosActivos]);
  return catalogo.filter((p) => activos.has(moduloDe(p)) && tienePermiso(rol, p));
}

/** Un usuario nunca puede asignar un rol más alto que el suyo. Owner solo lo asigna un owner. */
export function puedeAsignarRol(asignador: Rol, rol: Rol): boolean {
  return (
    ROLES.indexOf(asignador) <= ROLES.indexOf(rol) && (rol !== "owner" || asignador === "owner")
  );
}
