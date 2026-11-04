import { PERMISOS_CORE } from "./permisos-catalogo";
import {
  DENEGAR_GERENTE_PERSONAS_PR2,
  DENEGAR_VIEWER_PERSONAS_PR2,
  PERMITIR_SUPERVISOR_PERSONAS_PR2,
} from "./permisos-personas-pr2";
import type { Rol } from "./permisos-roles";

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
      PERMISOS_CORE.vinculosManage,
      PERMISOS_CORE.estructurasManage,
      PERMISOS_CORE.estructurasReadSensible,
      PERMISOS_CORE.personasNoRecontratarManage,
      ...DENEGAR_GERENTE_PERSONAS_PR2,
      PERMISOS_CORE.anexosRead,
      PERMISOS_CORE.anexosManage,
      PERMISOS_CORE.configManage,
      PERMISOS_CORE.firmasConfig,
      PERMISOS_CORE.finiquitosManage,
      "comercial:config.manage",
      "comercial:canales.manage",
      PERMISOS_CORE.etiquetasConfig,
      PERMISOS_CORE.actividadesAdmin,
      PERMISOS_CORE.marcaManage,
      PERMISOS_CORE.integracionesManage,
      PERMISOS_CORE.comunicacionesManage,
      PERMISOS_CORE.aprobacionesManage,
      PERMISOS_CORE.agentesManage,
      "agente:configurar",
      PERMISOS_CORE.cumplimientoManage,
      PERMISOS_CORE.cumplimientoDpaAceptar,
      PERMISOS_CORE.calendarioManage,
      PERMISOS_CORE.remuneracionesManage,
      PERMISOS_CORE.remuneracionesAprobar,
      PERMISOS_CORE.remuneracionesRetroactivo,
      "tickets:tipos.manage",
      "cpq:aprobar",
      "cpq:modelo.manage",
      "cpq:biblioteca.manage",
      "cpq:envios.aprobar",
      "cpq:puestos.confirmar",
    ],
  },
  supervisor: {
    permitir: [
      "ops:*",
      "rondas:*",
      "pauta:*",
      "asistencia:*",
      "tickets:*",
      "personas:read",
      "personas:*.read",
      PERMISOS_CORE.tenantRead,
      PERMISOS_CORE.cuentasRead,
      PERMISOS_CORE.instalacionesRead,
      PERMISOS_CORE.patronesRead,
      PERMISOS_CORE.funcionesRead,
      PERMISOS_CORE.vinculosRead,
      PERMISOS_CORE.personasRead,
      ...PERMITIR_SUPERVISOR_PERSONAS_PR2,
      PERMISOS_CORE.documentosRead,
      PERMISOS_CORE.firmasEnviar,
      PERMISOS_CORE.firmasRead,
      PERMISOS_CORE.configRead,
      PERMISOS_CORE.calendarioRead,
    ],
    denegar: [...FINANCIERO, "comercial:*", "cpq:*", "tickets:tipos.manage"],
  },
  viewer: {
    permitir: [
      "*:read",
      "*:*.read",
      "tickets:tickets.ver",
      "tickets:tickets.gestionar",
    ],
    denegar: [
      ...FINANCIERO,
      PERMISOS_CORE.consumosRead,
      PERMISOS_CORE.auditRead,
      PERMISOS_CORE.cumplimientoRead,
      PERMISOS_CORE.anexosRead,
      ...DENEGAR_VIEWER_PERSONAS_PR2,
      "comercial:solicitudes.read",
    ],
  },
};
