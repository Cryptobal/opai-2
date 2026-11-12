// CAR-286: métodos de acceso propios (passkeys y app autenticadora) por capacidad, con paridad MCP.
// Solo metadatos, solo del dueño, confirmación reciente de identidad para quitar y aviso si queda
// sin segundo factor; plataforma no puede quedar sin él.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant, U2 } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const YO = USUARIO_DE_PRUEBA.id;
const PK1 = "0192f3a0-0000-7000-8000-00000000aa01";
const PK2 = "0192f3a0-0000-7000-8000-00000000aa02";
const AJENA = "0192f3a0-0000-7000-8000-00000000aa03";

function semilla(o: { totp?: boolean; passkeys?: string[]; plataforma?: boolean } = {}) {
  const s = semillaTenant("viewer");
  const mias = o.passkeys ?? [PK1, PK2];
  return {
    ...s,
    user: s.user.map((u) =>
      u.id === YO
        ? {
            ...u,
            twoFactorEnabled: o.totp ?? false,
            passkeyEnabled: mias.length > 0,
            platformRole: o.plataforma ? "owner" : null,
          }
        : u,
    ),
    passkey: [
      ...mias.map((id, i) => ({
        id,
        userId: YO,
        name: `Llave ${i + 1}`,
        backedUp: i === 0,
        createdAt: new Date("2026-11-11T12:00:00Z"),
        publicKey: "PUBLICA-NO-SALE",
        credentialID: `cred-${i}`,
      })),
      {
        id: AJENA,
        userId: U2,
        name: "De Beto",
        backedUp: false,
        publicKey: "x",
        credentialID: "c",
      },
    ],
    twoFactor: o.totp ? [{ id: "tf", userId: YO, secret: "s", backupCodes: "b" }] : [],
    account: [{ id: "a", userId: YO, providerId: "credential", password: "hash" }],
  };
}

const agente = {
  actor: { tipo: "agent" as const, id: "k-1", viaUserId: YO },
  agente: { apiKeyId: "k-1", nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} },
};

describe("core.metodos_acceso.*", () => {
  it("lista solo mis métodos y sin secretos; un agente de tipo usuario también los ve", async () => {
    for (const extra of [{}, agente]) {
      const { ctx } = contextoDePrueba({ semilla: semilla({ totp: true }), ...extra });
      const r = await executeCapability(ctx, "core.metodos_acceso.list", {});
      expect(r).toMatchObject({
        ok: true,
        data: { appAutenticadora: true, tieneContrasena: true, conSegundoFactor: true },
      });
      const json = JSON.stringify(r);
      expect(json).not.toContain("PUBLICA-NO-SALE");
      expect(json).not.toContain("cred-");
      expect(json).not.toContain(AJENA);
    }
  });

  it("una key de servicio no tiene métodos propios", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), ...agente });
    ctx.principal = { tipo: "servicio", id: "k-1" };
    const r = await executeCapability(ctx, "core.metodos_acceso.list", {});
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("renombra solo una passkey propia, con vista previa y rastro de seguridad", async () => {
    const { ctx, tabla, eventos } = contextoDePrueba({ semilla: semilla() });
    const vista = await executeCapability(
      ctx,
      "core.metodos_acceso.renombrar_passkey",
      { id: PK1, nombre: "iPhone" },
      { dryRun: true },
    );
    expect(vista).toMatchObject({ ok: true, dryRun: true });
    expect(tabla("passkey").find((p) => p["id"] === PK1)?.["name"]).toBe("Llave 1");
    const r = await executeCapability(ctx, "core.metodos_acceso.renombrar_passkey", {
      id: PK1,
      nombre: "iPhone",
    });
    expect(r).toMatchObject({ ok: true, data: { nombre: "iPhone" } });
    expect(tabla("eventoSeguridad")).toMatchObject([{ tipo: "seguridad.passkey.renombrada" }]);
    expect(eventos.map((e) => e.capability)).toContain("core.metodos_acceso.renombrar_passkey");
    const ajena = await executeCapability(ctx, "core.metodos_acceso.renombrar_passkey", {
      id: AJENA,
      nombre: "Mía",
    });
    expect(ajena).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("quitar exige confirmar la identidad hace poco y consume la marca", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semilla() });
    const sin = await executeCapability(ctx, "core.metodos_acceso.quitar", {
      metodo: "passkey",
      id: PK1,
    });
    expect(sin).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(tabla("passkey")).toHaveLength(3);
    tabla("reautenticacion").push({ userId: YO });
    const r = await executeCapability(ctx, "core.metodos_acceso.quitar", {
      metodo: "passkey",
      id: PK1,
    });
    expect(r).toMatchObject({
      ok: true,
      data: { quitado: true, conSegundoFactor: true, aviso: null },
    });
    expect(tabla("reautenticacion")).toHaveLength(0);
    expect(tabla("eventoSeguridad")).toMatchObject([{ tipo: "seguridad.passkey.baja" }]);
    expect(tabla("user").find((u) => u["id"] === YO)?.["passkeyEnabled"]).toBe(true);
  });

  it("quitar el último segundo factor avisa del riesgo pero no lo impide", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semilla({ totp: true, passkeys: [] }) });
    tabla("reautenticacion").push({ userId: YO });
    const r = await executeCapability(ctx, "core.metodos_acceso.quitar", {
      metodo: "app_autenticadora",
    });
    expect(r).toMatchObject({ ok: true, data: { conSegundoFactor: false } });
    expect(r.ok && (r.data as { aviso: string }).aviso).toMatch(/solo con contraseña/);
    expect(tabla("twoFactor")).toHaveLength(0);
    expect(tabla("eventoSeguridad")).toMatchObject([{ tipo: "seguridad.mfa.desactivacion" }]);
  });

  it("una cuenta de plataforma no puede quedar sin segundo factor", async () => {
    const { ctx, tabla } = contextoDePrueba({
      semilla: semilla({ plataforma: true, passkeys: [PK1] }),
    });
    ctx.usuario = { ...USUARIO_DE_PRUEBA, platformRole: "owner" };
    tabla("reautenticacion").push({ userId: YO });
    const r = await executeCapability(ctx, "core.metodos_acceso.quitar", {
      metodo: "passkey",
      id: PK1,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(tabla("passkey").some((p) => p["id"] === PK1)).toBe(true);
  });

  it("un agente nunca quita métodos (solo personas)", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semilla(), ...agente });
    tabla("reautenticacion").push({ userId: YO });
    const r = await executeCapability(ctx, "core.metodos_acceso.quitar", {
      metodo: "passkey",
      id: PK1,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(tabla("passkey")).toHaveLength(3);
  });
});
