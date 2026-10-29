import { describe, expect, it } from "vitest";

import { escrituraFicha } from "@/app/(erp)/configuracion/usuarios/guardar-usuario";

const ROL = "0192f3a0-0000-7000-8000-0000000000d2";
const base = { membershipId: "m1", rol: "viewer", roleId: null, portales: ["erp"], activo: true };
const igual = { portales: ["erp"], activo: true };

describe("ficha de usuario: una sola escritura (CAR-37)", () => {
  it("solo cambia a un rol personalizado: core.roles.assign", () => {
    expect(escrituraFicha(base, { ...igual, rolSel: `rol:${ROL}` })).toEqual({
      id: "core.roles.assign",
      input: { membershipId: "m1", roleId: ROL },
    });
  });

  it("rol personalizado y portales a la vez: una sola core.users.update con roleId", () => {
    const e = escrituraFicha(base, {
      rolSel: `rol:${ROL}`,
      portales: ["erp", "supervisor"],
      activo: true,
    });
    expect(e).toEqual({
      id: "core.users.update",
      input: { membershipId: "m1", roleId: ROL, portales: ["erp", "supervisor"], estado: "activa" },
    });
  });

  it("de personalizado a rol base: rol nuevo y roleId null en la misma llamada", () => {
    const e = escrituraFicha({ ...base, roleId: ROL }, { ...igual, rolSel: "base:gerente" });
    expect(e.input).toMatchObject({ rol: "gerente", roleId: null });
  });

  it("sin cambio de rol no manda rol ni roleId", () => {
    const e = escrituraFicha(base, { rolSel: "base:viewer", portales: ["erp"], activo: false });
    expect(e).toEqual({
      id: "core.users.update",
      input: { membershipId: "m1", portales: ["erp"], estado: "suspendida" },
    });
  });
});
