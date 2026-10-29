// CAR-54 y CAR-45: restablecer el segundo factor (owner de la empresa y Plataforma) y borrar una
// cuenta sin empresas (Plataforma). Solo personas, con vista previa, auditadas y con aviso.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { type OpcionesPrueba } from "../src/testing/contexto";
import { M2, semillaTenant, U2 } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const OTRA = "0192f3a0-0000-7000-8000-0000000000f9";
const SUELTO = "0192f3a0-0000-7000-8000-0000000000c9";

function semilla(extra: { betoEnOtra?: boolean } = {}) {
  const s = semillaTenant("viewer");
  return {
    ...s,
    user: [
      ...s.user.map((u) => (u.id === U2 ? { ...u, twoFactorEnabled: true } : u)),
      { id: SUELTO, name: "Suelto", email: "suelto@prueba.cl", platformRole: null },
    ],
    membership: [
      ...s.membership,
      ...(extra.betoEnOtra
        ? [{ id: "m-otra", tenantId: OTRA, userId: U2, rol: "viewer", portales: ["erp"] }]
        : []),
    ],
    twoFactor: [{ id: "tf-1", userId: U2, secret: "x", backupCodes: "y" }],
    session: [
      { id: "s-1", userId: U2, token: "t1", updatedAt: new Date() },
      { id: "s-2", userId: SUELTO, token: "t2", updatedAt: new Date() },
    ],
  };
}

const agente = {
  actor: { tipo: "agent" as const, id: "k-1", viaUserId: USUARIO_DE_PRUEBA.id },
  agente: { apiKeyId: "k-1", nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} },
};

describe("core.users.restablecer_mfa (owner)", () => {
  const ctxOwner = (o: Partial<OpcionesPrueba> = {}) =>
    contextoDePrueba({ rol: "owner", semilla: semilla(), ...o });

  it("vista previa no toca nada; la real borra el MFA, cierra sesiones, audita y avisa", async () => {
    const { ctx, tabla, eventos, correos, esperar } = ctxOwner();
    const input = { membershipId: M2 };
    const vista = await executeCapability(ctx, "core.users.restablecer_mfa", input, {
      dryRun: true,
    });
    expect(vista).toMatchObject({ ok: true, dryRun: true, data: { sesionesCerradas: 0 } });
    expect(tabla("twoFactor")).toHaveLength(1);
    const r = await executeCapability(ctx, "core.users.restablecer_mfa", input);
    expect(r).toMatchObject({ ok: true, data: { userId: U2, sesionesCerradas: 1 } });
    expect(tabla("twoFactor")).toHaveLength(0);
    expect(tabla("session").map((s) => s["userId"])).toEqual([SUELTO]);
    expect(tabla("user").find((u) => u["id"] === U2)?.["twoFactorEnabled"]).toBe(false);
    expect(eventos.map((e) => e.capability)).toContain("core.users.restablecer_mfa");
    await esperar();
    expect(correos).toMatchObject([{ para: "beto@prueba.cl" }]);
    expect(correos[0]?.texto).toContain("Un owner de tu empresa");
  });

  it("un admin no puede; nadie se lo hace a sí mismo; un agente nunca", async () => {
    const admin = contextoDePrueba({ rol: "admin", semilla: semilla() });
    expect(
      await executeCapability(admin.ctx, "core.users.restablecer_mfa", { membershipId: M2 }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    // H7: un rol con `core:owners.manage` concedido (personalizado o excepción) tampoco.
    const delegado = contextoDePrueba({
      rol: "admin",
      permisos: ["core:owners.manage"],
      semilla: semilla(),
    });
    expect(
      await executeCapability(delegado.ctx, "core.users.restablecer_mfa", { membershipId: M2 }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(delegado.tabla("twoFactor")).toHaveLength(1);
    const propio = await executeCapability(ctxOwner().ctx, "core.users.restablecer_mfa", {
      membershipId: semillaTenant().membership[0]?.id,
    });
    expect(propio).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const conKey = ctxOwner({ ...agente, scopes: ["*"] });
    const r = await executeCapability(conKey.ctx, "core.users.restablecer_mfa", {
      membershipId: M2,
    });
    expect(r).toMatchObject({ ok: false });
    expect(conKey.tabla("twoFactor")).toHaveLength(1);
  });

  it("si el usuario también está en otra empresa, solo Plataforma puede", async () => {
    const { ctx, tabla } = contextoDePrueba({
      rol: "owner",
      semilla: semilla({ betoEnOtra: true }),
    });
    const r = await executeCapability(ctx, "core.users.restablecer_mfa", { membershipId: M2 });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(tabla("twoFactor")).toHaveLength(1);
    expect(TENANT_DE_PRUEBA).not.toBe(OTRA);
  });
});

describe("platform.usuarios.* (CAR-54, CAR-45)", () => {
  const plataforma = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
  const ctxPlat = () =>
    contextoDePrueba({ usuario: plataforma, semilla: semilla({ betoEnOtra: true }) });

  it("restablece el MFA de quien está en varias empresas, auditado en la cadena de plataforma", async () => {
    const { ctx, tabla, eventos } = ctxPlat();
    const r = await executeCapability(ctx, "platform.usuarios.restablecer_mfa", {
      email: "beto@prueba.cl",
    });
    expect(r).toMatchObject({ ok: true, data: { userId: U2 } });
    expect(tabla("twoFactor")).toHaveLength(0);
    expect(eventos).toEqual([]);
    expect(tabla("auditoriaGlobal")).toMatchObject([
      { capability: "platform.usuarios.restablecer_mfa" },
    ]);
  });

  it("borrar: no con membresías; sí la cuenta suelta, con vista previa", async () => {
    const { ctx, tabla } = ctxPlat();
    const conEmpresa = await executeCapability(ctx, "platform.usuarios.borrar", {
      email: "beto@prueba.cl",
    });
    expect(conEmpresa).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const vista = await executeCapability(
      ctx,
      "platform.usuarios.borrar",
      { email: "suelto@prueba.cl" },
      { dryRun: true },
    );
    expect(vista).toMatchObject({ ok: true, dryRun: true });
    expect(tabla("user").some((u) => u["id"] === SUELTO)).toBe(true);
    expect(
      await executeCapability(ctx, "platform.usuarios.borrar", { email: "suelto@prueba.cl" }),
    ).toMatchObject({ ok: true });
    expect(tabla("user").some((u) => u["id"] === SUELTO)).toBe(false);
    expect(tabla("session").some((s) => s["userId"] === SUELTO)).toBe(false);
  });

  it("sin rol de plataforma no se puede", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semilla() });
    const r = await executeCapability(ctx, "platform.usuarios.borrar", {
      email: "suelto@prueba.cl",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
