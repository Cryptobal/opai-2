import { describe, expect, it } from "vitest";

import { PERMISOS_CORE as P, type Rol, ROLES, tienePermiso } from "./permisos";

// Permisos del Brief 02 por rol: [owner, admin, gerente, supervisor, viewer].
const TABLA: Record<string, readonly [boolean, boolean, boolean, boolean, boolean]> = {
  [P.cuentasRead]: [true, true, true, true, true],
  [P.cuentasManage]: [true, true, true, false, false],
  // CRM PR 2a: el supervisor no entra a Comercial; el catálogo de etiquetas es de owner y admin.
  [P.actividadesRead]: [true, true, true, false, true],
  [P.actividadesManage]: [true, true, true, false, false],
  [P.actividadesAdmin]: [true, true, false, false, false],
  [P.etiquetasRead]: [true, true, true, false, true],
  [P.etiquetasManage]: [true, true, true, false, false],
  [P.etiquetasConfig]: [true, true, false, false, false],
  [P.instalacionesRead]: [true, true, true, true, true],
  // Puestos (Brief 11): el supervisor lee los catálogos pero no los edita ni los desactiva.
  [P.patronesRead]: [true, true, true, true, true],
  [P.patronesManage]: [true, true, true, false, false],
  [P.patronesDesactivar]: [true, true, true, false, false],
  [P.funcionesRead]: [true, true, true, true, true],
  [P.funcionesManage]: [true, true, true, false, false],
  [P.funcionesDesactivar]: [true, true, true, false, false],
  [P.personasRead]: [true, true, true, true, true],
  [P.personasManage]: [true, true, true, false, false],
  // P1 "No recontratar" (Personas y Cargos PR 1): solo owner y admin ven y marcan por defecto.
  [P.personasNoRecontratarManage]: [true, true, false, false, false],
  [P.personasPrevisionRead]: [true, true, false, true, false],
  [P.personasPrevisionManage]: [true, true, false, false, false],
  [P.personasPagoRead]: [true, true, false, true, false],
  [P.personasPagoManage]: [true, true, false, false, false],
  [P.personasPagoAprobar]: [true, true, false, false, false],
  [P.personasLaboralRead]: [true, true, true, true, false],
  [P.personasLaboralManage]: [true, true, false, false, false],
  [P.documentosRead]: [true, true, true, true, true],
  [P.documentosManage]: [true, true, true, false, false],
  // CAR-182: subir solo a instalaciones a cargo; el supervisor sí, el viewer no (`*:*.read` no lo cubre).
  [P.documentosSubirAlcance]: [true, true, true, true, false],
  // Firma (firma.md §8). Enviar: owner/admin sí, gerente «según tipo», supervisor «actas», viewer no
  // (el tipo y el alcance se aplican en la capacidad). Leer: todos «según tipo» (viewer por *:*.read).
  // Configurar la política y registrar el finiquito: solo owner/admin.
  [P.firmasEnviar]: [true, true, true, true, false],
  [P.firmasRead]: [true, true, true, true, true],
  [P.firmasConfig]: [true, true, false, false, false],
  [P.finiquitosManage]: [true, true, false, false, false],
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
