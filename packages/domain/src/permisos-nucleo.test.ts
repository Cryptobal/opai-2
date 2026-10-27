import { describe, expect, it } from "vitest";

import { PERMISOS_CORE as P, type Rol, ROLES, tienePermiso } from "./permisos";

// Permisos del Brief 02 por rol: [owner, admin, gerente, supervisor, viewer].
const TABLA: Record<string, readonly [boolean, boolean, boolean, boolean, boolean]> = {
  [P.cuentasRead]: [true, true, true, true, true],
  [P.cuentasManage]: [true, true, true, false, false],
  [P.instalacionesRead]: [true, true, true, true, true],
  [P.personasRead]: [true, true, true, true, true],
  [P.personasManage]: [true, true, true, false, false],
  [P.documentosRead]: [true, true, true, true, true],
  [P.documentosManage]: [true, true, true, false, false],
  [P.estructurasRead]: [true, true, true, false, true],
  [P.estructurasManage]: [true, true, false, false, false],
  [P.estructurasReadSensible]: [true, true, false, false, false],
  [P.configRead]: [true, true, true, true, true],
  [P.configManage]: [true, true, false, false, false],
  [P.marcaManage]: [true, true, false, false, false],
  [P.integracionesManage]: [true, true, false, false, false],
  [P.comunicacionesManage]: [true, true, false, false, false],
  [P.consumosRead]: [true, true, true, false, false],
  [P.aprobacionesManage]: [true, true, false, false, false],
  [P.agentesManage]: [true, true, false, false, false],
  [P.auditRead]: [true, true, true, false, false],
  // Cumplimiento (Ley 21.719) trae datos personales sensibles: viewer NO lo lee (solo owner/admin/gerente).
  [P.cumplimientoRead]: [true, true, true, false, false],
  [P.cumplimientoManage]: [true, true, false, false, false],
  // Aceptar el DPA: solo el owner (§16.1, t331u); ni admin ni gerente.
  [P.cumplimientoDpaAceptar]: [true, false, false, false, false],
};

describe("permisos del núcleo (Brief 02)", () => {
  for (const [permiso, esperado] of Object.entries(TABLA)) {
    it(permiso, () => {
      const real = ROLES.map((r: Rol) => tienePermiso(r, permiso));
      expect(real).toEqual([...esperado]);
    });
  }
});
