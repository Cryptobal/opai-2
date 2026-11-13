import { PERMISOS_CORE } from "./permisos-catalogo";
import { PERMISOS_GERENTE, PERMISOS_LECTOR } from "./permisos-base";
import { PERMITIR_SUPERVISOR_PERSONAS_PR2 } from "./permisos-personas-pr2";
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
  // CAR-350: lista explícita (permisos-base*.ts); lo no clasificado no se concede.
  gerente: { permitir: PERMISOS_GERENTE, denegar: [] },
  supervisor: {
    permitir: [
      "ops:*",
      "rondas:*",
      "acceso:read",
      "pauta:*",
      "asistencia:ver",
      "asistencia:corregir",
      "tickets:*",
      "desempeno:scorecards.read",
      "desempeno:resultados.ver",
      "rendiciones:rendir",
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
      PERMISOS_CORE.documentosSubirAlcance,
      PERMISOS_CORE.firmasEnviar,
      PERMISOS_CORE.firmasRead,
      PERMISOS_CORE.configRead,
      PERMISOS_CORE.calendarioRead,
    ],
    denegar: [...FINANCIERO, "comercial:*", "cpq:*", "tickets:tipos.manage"],
  },
  viewer: { permitir: PERMISOS_LECTOR, denegar: [] },
};
