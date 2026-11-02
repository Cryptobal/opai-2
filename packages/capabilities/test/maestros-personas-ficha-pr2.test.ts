import { randomBytes } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { PERMISOS_CORE, tienePermiso } from "@opai/domain";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";
import { manejarCapacidadHttp } from "../src/http";
import { ejecutarHerramienta, herramientasMcp } from "../src/mcp";
import * as mod from "../src";

const personaId = "0192f3a0-0000-7000-8000-0000000000b1";
const planClaro = "Plan Salud Total 3.2 UF";

beforeAll(() => {
  process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
  process.env["OPAI_SECRETS_KEY_VERSION"] = "1";
});

function semilla() {
  return {
    persona: [
      {
        id: personaId,
        tenantId: TENANT_DE_PRUEBA,
        nombres: "Ana",
        apellidos: "Ficticia",
        rut: "12345678-5",
        estado: "activa",
      },
    ],
  };
}

describe("Personas ficha PR 2 (capacidades)", () => {
  it("gerente no lee previsión ni pago; sí contacto laboral", () => {
    expect(tienePermiso("gerente", PERMISOS_CORE.personasPrevisionRead)).toBe(false);
    expect(tienePermiso("gerente", PERMISOS_CORE.personasPagoRead)).toBe(false);
    expect(tienePermiso("gerente", PERMISOS_CORE.personasLaboralRead)).toBe(true);
  });

  it("supervisor lee previsión y pago enmascarado", async () => {
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const { ctx } = contextoDePrueba({ semilla: semilla(), rol: "supervisor" });
    const r = await mod.executeCapability(ctx, "core.personas.laboral_ver", { id: personaId });
    expect(r).toMatchObject({ ok: true, data: { personaId } });
  });

  it("laboral_actualizar admite dryRun", async () => {
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const { ctx } = contextoDePrueba({ semilla: semilla(), rol: "owner" });
    const r = await mod.executeCapability(
      ctx,
      "core.personas.laboral_actualizar",
      { id: personaId, contacto: { emergenciaNombre: "Contacto QA" } },
      { dryRun: true },
    );
    expect(r).toMatchObject({ ok: true, data: { personaId } });
  });

  it("pago_aprobar_cambio rechaza autoaprobación", async () => {
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const { ctx } = contextoDePrueba({ semilla: semilla(), rol: "owner", usuario: USUARIO_DE_PRUEBA });
    await ctx.db.personaPagoSolicitud.create({
      data: {
        tenantId: TENANT_DE_PRUEBA,
        personaId,
        estado: "pendiente",
        solicitadoPorId: USUARIO_DE_PRUEBA.id,
        bancoCodigo: "001",
        tipoCuenta: "corriente",
        numeroCuenta: "enc:test",
      },
    });
    const r = await mod.executeCapability(
      ctx,
      "core.personas.pago_aprobar_cambio",
      { id: personaId },
      { dryRun: true },
    );
    expect(r).toMatchObject({ ok: false });
  });

  it("R-PER-004: supervisor ve plan ISAPRE enmascarado por capacidad, API v1 y MCP; owner lo ve en claro", async () => {
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const { ctx: ownerCtx } = contextoDePrueba({ semilla: semilla(), rol: "owner" });
    await mod.executeCapability(
      ownerCtx,
      "core.personas.prevision_actualizar",
      {
        id: personaId,
        planIsapre: planClaro,
        afp: "modelo",
      },
      { dryRun: false },
    );
    const fila = await ownerCtx.db.personaPrevision.findUnique({ where: { personaId } });
    expect(fila?.planIsapre).toBeTruthy();
    expect(fila?.planIsapre).not.toBe(planClaro);

    const { ctx: supCtx } = contextoDePrueba({
      semilla: { ...semilla(), personaPrevision: fila ? [fila] : [] },
      rol: "supervisor",
    });
    const input = { id: personaId };

    const directo = await mod.executeCapability(supCtx, "core.personas.prevision_ver", input);
    expect(directo).toMatchObject({ ok: true, data: { planIsapre: "••••" } });
    expect(JSON.stringify(directo)).not.toContain(planClaro);

    const http = await manejarCapacidadHttp(
      new Request(
        `http://x/api/v1/core/personas/prevision_ver?input=${encodeURIComponent(JSON.stringify(input))}`,
      ),
      ["core", "personas", "prevision_ver"],
      async () => supCtx,
    );
    expect(http.status).toBe(200);
    const httpJson = await http.json();
    expect(httpJson).toMatchObject({ ok: true, data: { planIsapre: "••••" } });
    expect(JSON.stringify(httpJson)).not.toContain(planClaro);

    const herramienta = herramientasMcp(supCtx).find((h) => h.nombre === "core_personas_prevision_ver");
    expect(herramienta).toBeDefined();
    const mcp = await ejecutarHerramienta(supCtx, herramienta!, input);
    expect(mcp).toMatchObject({ ok: true, data: { planIsapre: "••••" } });
    expect(JSON.stringify(mcp)).not.toContain(planClaro);

    const owner = await mod.executeCapability(ownerCtx, "core.personas.prevision_ver", input);
    expect(owner).toMatchObject({ ok: true, data: { planIsapre: planClaro } });
  });
});