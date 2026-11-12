// Slack F1 (CAR-291, ADR-093): configuración por empresa. Slack simulado (nunca el real ni el de Gard).
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { limpiarSlack, prepararSlack } from "./slack-util";

beforeEach(prepararSlack);
afterEach(limpiarSlack);

describe("core.slack: configuración", () => {
  it("guarda la configuración con los valores por defecto aprobados y no conecta nada", async () => {
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.slack.configurar", {
      avisos: { fueraDeZona: true },
    });
    expect(r).toMatchObject({
      ok: true,
      data: {
        conectada: false,
        config: {
          margenAtrasoMin: 15,
          avisos: { atraso: true, ausencia: true, fueraDeZona: true, sinRelevo: false },
        },
      },
    });
    const lista = await executeCapability(ctx, "core.integraciones.list", {});
    const slack = lista.ok
      ? (lista.data as { proveedor: string; estado: string }[]).find((i) => i.proveedor === "slack")
      : null;
    expect(slack?.estado).toBe("no_configurada");
  });

  it("la vista previa no guarda", async () => {
    const { ctx } = contextoDePrueba();
    await executeCapability(
      ctx,
      "core.slack.configurar",
      { margenAtrasoMin: 30 },
      { dryRun: true },
    );
    const r = await executeCapability(ctx, "core.slack.estado", {});
    expect(r).toMatchObject({ ok: true, data: { config: { margenAtrasoMin: 15 } } });
  });

  it("el escalamiento del pánico exige un grupo vigente de la misma empresa", async () => {
    const { ctx } = contextoDePrueba();
    const sinGrupo = await executeCapability(ctx, "core.slack.configurar", {
      panico: { escalar: true },
    });
    expect(sinGrupo).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const inexistente = await executeCapability(ctx, "core.slack.configurar", {
      panico: { escalar: true, escalarAGrupoId: "0192f3a0-0000-7000-8000-0000000000aa" },
    });
    expect(inexistente).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const grupo = await ctx.db.grupoUsuarios.create({
      data: { tenantId: TENANT_DE_PRUEBA, nombre: "Central" },
    });
    const ok = await executeCapability(ctx, "core.slack.configurar", {
      panico: { escalar: true, escalarAGrupoId: grupo.id },
    });
    expect(ok).toMatchObject({
      ok: true,
      data: { config: { panico: { escalar: true, escalarMinutos: 5 } } },
    });
  });

  it("rechaza valores fuera de rango y claves desconocidas", async () => {
    const { ctx } = contextoDePrueba();
    expect(
      await executeCapability(ctx, "core.slack.configurar", { margenAtrasoMin: 0 }),
    ).toMatchObject({ ok: false });
    expect(
      await executeCapability(ctx, "core.slack.configurar", {
        canales: { general: { id: "x", nombre: "y" } },
      }),
    ).toMatchObject({ ok: false });
    expect(
      await executeCapability(ctx, "core.slack.configurar", { token: "xoxb-1" }),
    ).toMatchObject({ ok: false });
  });

  it("solo owner y admin la configuran", async () => {
    const { ctx } = contextoDePrueba({ rol: "supervisor" });
    expect(await executeCapability(ctx, "core.slack.configurar", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(await executeCapability(ctx, "core.slack.estado", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("Slack no se configura ni se prueba por la vía genérica de integraciones", async () => {
    const { ctx } = contextoDePrueba();
    expect(
      await executeCapability(ctx, "core.integraciones.configurar", {
        proveedor: "slack",
        modalidad: "plataforma",
      }),
    ).toMatchObject({ ok: false });
    expect(
      await executeCapability(ctx, "core.integraciones.probar", { proveedor: "slack" }),
    ).toMatchObject({ ok: false });
  });
});
