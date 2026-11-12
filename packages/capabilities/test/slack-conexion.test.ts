// Slack F1 (CAR-291, ADR-093): conexión por empresa. Slack siempre simulado (nunca el real ni el de Gard).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { firmarEstadoOAuth } from "@opai/integrations";

import { executeCapability } from "../src";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import {
  CLAVE,
  conectarSlack,
  estadoValido,
  instalacion,
  limpiarSlack,
  llamadas,
  prepararSlack,
  respuestas,
  TOKEN,
} from "./slack-util";

beforeEach(prepararSlack);
afterEach(limpiarSlack);

describe("core.slack: conexión", () => {
  it("sin Slack conectado todo sigue igual: estado apagado y configuración mínima", async () => {
    delete process.env["SLACK_CLIENT_ID"];
    const r = await executeCapability(contextoDePrueba().ctx, "core.slack.estado", {});
    expect(r).toMatchObject({
      ok: true,
      data: { disponible: false, conectada: false, espacio: null },
    });
    expect(llamadas).toEqual([]);
  });

  it("iniciar entrega el enlace a Slack con un estado ligado a la empresa y a la persona", async () => {
    const r = await executeCapability(contextoDePrueba().ctx, "core.slack.iniciar_conexion", {});
    const url = new URL(r.ok ? (r.data as { url: string }).url : "http://x");
    expect(url.hostname).toBe("slack.com");
    expect(url.searchParams.get("redirect_uri")).toMatch(
      /\/api\/integraciones\/slack\/oauth\/callback$/,
    );
    expect(url.searchParams.get("state")).toBeTruthy();
  });

  it("conectar guarda el token cifrado, liga el espacio y no deja el token ni el código en la auditoría", async () => {
    const { ctx, r } = await conectarSlack();
    expect(r).toMatchObject({ ok: true, data: { conectada: true, espacio: "Espacio de pruebas" } });
    const fuga = JSON.stringify(await ctx.db.secreto.findMany({})) + JSON.stringify(r);
    expect(fuga).not.toContain(TOKEN);
    const audit = await executeCapability(ctx, "core.audit.list", {});
    expect(JSON.stringify(audit)).not.toContain("codigo-oauth-1");
    expect(JSON.stringify(audit)).not.toContain(TOKEN);
  });

  it("rechaza un estado de otra persona, de otra empresa o vencido, sin llamar a Slack", async () => {
    const ctx = contextoDePrueba().ctx;
    const ajeno = firmarEstadoOAuth(CLAVE, {
      tenantId: TENANT_DE_PRUEBA,
      userId: "0192f3a0-0000-7000-8000-0000000000ff",
    });
    const otraEmpresa = firmarEstadoOAuth(CLAVE, {
      tenantId: "0192f3a0-0000-7000-8000-0000000000fe",
      userId: USUARIO_DE_PRUEBA.id,
    });
    const vencido = firmarEstadoOAuth(
      CLAVE,
      { tenantId: TENANT_DE_PRUEBA, userId: USUARIO_DE_PRUEBA.id },
      1000,
    );
    for (const estado of [ajeno, otraEmpresa, vencido, "estado-inventado-abcdef"]) {
      const r = await executeCapability(ctx, "core.slack.conectar", {
        code: "codigo-oauth-1",
        estado,
      });
      expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
    expect(llamadas).toEqual([]);
  });

  it("si la empresa ya está en otro espacio, rechaza sin revocar ningún token ni cambiar nada", async () => {
    const { ctx } = await conectarSlack();
    respuestas["oauth.v2.access"] = instalacion("T0OTRO22");
    const r = await executeCapability(ctx, "core.slack.conectar", {
      code: "codigo-oauth-2",
      estado: estadoValido(),
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE", detalles: { motivo: "otro_espacio" } },
    });
    expect(llamadas.filter((l) => l.metodo === "auth.revoke")).toEqual([]);
    expect((await ctx.db.slackInstalacion.findMany({}))[0]).toMatchObject({ teamId: "T0PRUEBA1" });
  });

  it("si el espacio ya es de otra empresa, rechaza sin revocar: el token puede ser el de esa empresa", async () => {
    const { ctx } = contextoDePrueba();
    const duplicado = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    vi.spyOn(ctx.db.slackInstalacion, "upsert").mockRejectedValue(duplicado);
    const r = await executeCapability(ctx, "core.slack.conectar", {
      code: "codigo-oauth-1",
      estado: estadoValido(),
    });
    expect(r).toMatchObject({ ok: false, error: { detalles: { motivo: "espacio_ocupado" } } });
    expect(llamadas.filter((l) => l.metodo === "auth.revoke")).toEqual([]);
  });

  it("un error de Slack se muestra en español, sin el cuerpo de Slack", async () => {
    respuestas["oauth.v2.access"] = { ok: false, error: "invalid_code" };
    const { r } = await conectarSlack();
    expect(r).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("venció o ya se usó") },
    });
  });

  it("desconectar revoca en Slack, borra token e instalación y conserva la configuración", async () => {
    const { ctx } = await conectarSlack();
    const cfg = await executeCapability(ctx, "core.slack.configurar", { margenAtrasoMin: 20 });
    expect(cfg).toMatchObject({ ok: true });
    const r = await executeCapability(ctx, "core.slack.desconectar", {});
    expect(r).toMatchObject({
      ok: true,
      data: { conectada: false, revocadoEnSlack: true, config: { margenAtrasoMin: 20 } },
    });
    expect(llamadas.find((l) => l.metodo === "auth.revoke")?.auth).toBe(`Bearer ${TOKEN}`);
    expect(await ctx.db.secreto.findMany({ where: { nombre: "bot_token" } })).toEqual([]);
    expect(await ctx.db.slackInstalacion.findMany({})).toEqual([]);
  });

  it("si Slack no responde al desconectar, igual se borra en OPAI", async () => {
    const { ctx } = await conectarSlack();
    respuestas["auth.revoke"] = new Error("red caída");
    const r = await executeCapability(ctx, "core.slack.desconectar", {});
    expect(r).toMatchObject({ ok: true, data: { conectada: false, revocadoEnSlack: false } });
  });
});
