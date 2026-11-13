import { PERMISOS_CORE } from "./permisos-catalogo";
import { PERMISOS_GERENTE, PERMISOS_LECTOR, PERMISOS_SUPERVISOR } from "./permisos-base";
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
  // CAR-387: también por lista explícita; un permiso nuevo de Operaciones, Rondas, Pauta o Tickets
  // no se le concede hasta que alguien lo clasifica.
  supervisor: { permitir: PERMISOS_SUPERVISOR, denegar: [] },
  viewer: { permitir: PERMISOS_LECTOR, denegar: [] },
};
