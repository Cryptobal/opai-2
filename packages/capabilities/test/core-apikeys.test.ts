import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { hashApiKey, slugDeApiKey } from "../src/core/apikey-formato";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("core.apikeys.*", () => {
  it("no emite credenciales sin enrolar/verificar, ni si falta la garantía del borde", async () => {
    for (const mfa of [
      undefined,
      { activa: false, verificada: false, obligatoria: true },
      { activa: true, verificada: false, obligatoria: true },
    ]) {
      const { ctx, tabla } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
      if (mfa) ctx.mfa = mfa;
      else delete ctx.mfa;
      for (const dryRun of [false, true]) {
        expect(
          await executeCapability(
            ctx,
            "core.apikeys.create",
            { nombre: "Prueba", scopes: ["*"] },
            { dryRun },
          ),
        ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      }
      expect(tabla("apiKey")).toHaveLength(0);
    }
  });
  it("create devuelve el secreto una sola vez; en base solo hash y prefijo", async () => {
    const { ctx, tabla } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.apikeys.create", {
      nombre: "Grokbot",
      scopes: ["*"],
    });
    if (!r.ok) throw new Error(r.error.message);
    const { secreto, prefijo } = r.data as { secreto: string; prefijo: string };
    expect(secreto).toMatch(/^opai_gard_[0-9A-Za-z]{32}$/);
    expect(slugDeApiKey(secreto)).toBe("gard");
    expect(prefijo).toBe(secreto.slice(0, 14));
    const [fila] = tabla("apiKey");
    expect(fila).toMatchObject({
      hash: hashApiKey(secreto),
      userId: USUARIO_DE_PRUEBA.id,
      scopes: ["*"],
    });
    expect(JSON.stringify(fila)).not.toContain(secreto);

    const lista = await executeCapability(ctx, "core.apikeys.list", {});
    expect(JSON.stringify(lista)).not.toContain(secreto);
    expect(lista).toMatchObject({ ok: true, data: [{ nombre: "Grokbot", valida: true }] });
  });

  it("dryRun no crea ni revela secreto", async () => {
    const { ctx, tabla } = contextoDePrueba({ rol: "admin", semilla: semillaTenant() });
    const r = await executeCapability(
      ctx,
      "core.apikeys.create",
      { nombre: "Xa", scopes: ["core"] },
      { dryRun: true },
    );
    expect(r).toMatchObject({ ok: true, data: { secreto: null } });
    expect(tabla("apiKey")).toHaveLength(0);
  });

  it("rechaza scopes desconocidos y roles sin core:apikeys.manage", async () => {
    const owner = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const malo = await executeCapability(owner.ctx, "core.apikeys.create", {
      nombre: "Xa",
      scopes: ["nada"],
    });
    expect(malo).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const gerente = contextoDePrueba({ rol: "gerente", semilla: semillaTenant() });
    const r = await executeCapability(gerente.ctx, "core.apikeys.create", {
      nombre: "Xa",
      scopes: ["*"],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("revoke marca la key como inválida en la lista", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const c = await executeCapability(ctx, "core.apikeys.create", {
      nombre: "Ka",
      scopes: ["core"],
    });
    const id = c.ok ? (c.data as { id: string }).id : "";
    expect(await executeCapability(ctx, "core.apikeys.revoke", { apiKeyId: id })).toMatchObject({
      ok: true,
    });
    expect(await executeCapability(ctx, "core.apikeys.list", {})).toMatchObject({
      ok: true,
      data: [{ valida: false }],
    });
  });
});
