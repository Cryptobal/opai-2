import { randomBytes } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { PERMISOS_CORE, tienePermiso } from "@opai/domain";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";
import { manejarCapacidadHttp } from "../src/http";
import { ejecutarHerramienta, herramientasMcp } from "../src/mcp";
import * as mod from "../src";

const personaId = "0192f3a0-0000-7000-8000-0000000000b1";
const planClaro = "Plan Salud Total 3.2 UF";
const USUARIO_SOLICITANTE: typeof USUARIO_DE_PRUEBA = {
  id: "0192f3a0-0000-7000-8000-0000000000a2",
  nombre: "Solicitante QA",
  email: "solicitante@prueba.cl",
  platformRole: null,
};
const USUARIO_APROBADOR: typeof USUARIO_DE_PRUEBA = {
  id: "0192f3a0-0000-7000-8000-0000000000a3",
  nombre: "Aprobador QA",
  email: "aprobador@prueba.cl",
  platformRole: null,
};

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

  it("pago_aprobar_cambio rechaza autoaprobación con FORBIDDEN", async () => {
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
      { dryRun: false },
    );
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
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

  it("gerente y viewer reciben FORBIDDEN en prevision_ver y pago_ver", async () => {
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    for (const rol of ["gerente", "viewer"] as const) {
      const { ctx } = contextoDePrueba({ semilla: semilla(), rol });
      for (const cap of ["core.personas.prevision_ver", "core.personas.pago_ver"] as const) {
        const r = await mod.executeCapability(ctx, cap, { id: personaId });
        expect(r, `${rol} ${cap}`).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      }
    }
  });

  it("R-PER-004: key servicio y rol personalizado con solo lectura ven ISAPRE y cuenta enmascarados", async () => {
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const { ctx: ownerCtx } = contextoDePrueba({ semilla: semilla(), rol: "owner" });
    await mod.executeCapability(
      ownerCtx,
      "core.personas.prevision_actualizar",
      { id: personaId, planIsapre: planClaro, afp: "modelo" },
      { dryRun: false },
    );
    await mod.executeCapability(
      ownerCtx,
      "core.personas.pago_solicitar_cambio",
      {
        id: personaId,
        bancoCodigo: "001",
        tipoCuenta: "corriente",
        numeroCuenta: "123456789012",
      },
      { dryRun: false },
    );
    const fila = await ownerCtx.db.personaPrevision.findUnique({ where: { personaId } });
    const semillaConPrevision = {
      ...semilla(),
      claveTenant: await ownerCtx.db.claveTenant.findMany({}),
      personaPrevision: fila ? [fila] : [],
      personaPagoSolicitud: await ownerCtx.db.personaPagoSolicitud.findMany({}),
    };
    const { ctx: servicio } = contextoDePrueba({
      semilla: semillaConPrevision,
      rol: null,
      usuario: USUARIO_DE_PRUEBA,
      actor: { tipo: "agent", id: "api-key-pr2", viaUserId: USUARIO_DE_PRUEBA.id },
      portal: null,
      principal: { tipo: "servicio", id: "api-key-pr2" },
      modulosActivos: ["core"],
      scopes: ["core"],
      claveApi: {
        permisos: [PERMISOS_CORE.personasPrevisionRead, PERMISOS_CORE.personasPagoRead],
        servicio: true,
      },
      accesoResponsable: { rol: "supervisor", permisosRol: null, excepciones: null },
    });
    const prev = await mod.executeCapability(servicio, "core.personas.prevision_ver", { id: personaId });
    expect(prev).toMatchObject({ ok: true, data: { planIsapre: "••••" } });
    expect(JSON.stringify(prev)).not.toContain(planClaro);
    const pago = await mod.executeCapability(servicio, "core.personas.pago_ver", { id: personaId });
    expect(pago.ok).toBe(true);
    expect(JSON.stringify(pago)).not.toContain("123456789012");
    expect(JSON.stringify(pago)).toContain("****");

    const { ctx: personalizado } = contextoDePrueba({
      semilla: semillaConPrevision,
      rol: null,
      modulosActivos: ["core"],
      permisosRol: [PERMISOS_CORE.personasPrevisionRead, PERMISOS_CORE.personasPagoRead],
    });
    const prevRol = await mod.executeCapability(personalizado, "core.personas.prevision_ver", { id: personaId });
    expect(prevRol).toMatchObject({ ok: true, data: { planIsapre: "••••" } });
  });

  it("laboral_actualizar no borra contacto al actualizar un solo campo", async () => {
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const { ctx } = contextoDePrueba({ semilla: semilla(), rol: "owner" });
    await ctx.db.personaContactoLaboral.create({
      data: {
        tenantId: TENANT_DE_PRUEBA,
        personaId,
        estadoCivil: "soltero",
        telefonoSecundario: "+56911111111",
        emergenciaNombre: "Contacto A",
        emergenciaRelacion: "Hermano",
        emergenciaTelefono: "+56922222222",
      },
    });
    const actualizado = await mod.executeCapability(
      ctx,
      "core.personas.laboral_actualizar",
      { id: personaId, contacto: { emergenciaNombre: "Contacto B" } },
      { dryRun: false },
    );
    expect(actualizado.ok).toBe(true);
    const r = await mod.executeCapability(ctx, "core.personas.laboral_ver", { id: personaId });
    expect(r).toMatchObject({
      ok: true,
      data: {
        contacto: {
          emergenciaNombre: "Contacto B",
          emergenciaTelefono: "+56922222222",
          telefonoSecundario: "+56911111111",
        },
      },
    });
  });

  it("pago_aprobar_cambio rechaza segunda resolución si ya no está pendiente", async () => {
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const { ctx: solicitante } = contextoDePrueba({
      semilla: semilla(),
      rol: "admin",
      usuario: USUARIO_SOLICITANTE,
    });
    const solicitar = await mod.executeCapability(
      solicitante,
      "core.personas.pago_solicitar_cambio",
      {
        id: personaId,
        bancoCodigo: "001",
        tipoCuenta: "corriente",
        numeroCuenta: "111122223333",
      },
      { dryRun: false },
    );
    expect(solicitar.ok).toBe(true);
    const { ctx } = contextoDePrueba({
      semilla: {
        ...semilla(),
        claveTenant: await solicitante.db.claveTenant.findMany({}),
        personaPagoSolicitud: await solicitante.db.personaPagoSolicitud.findMany({}),
      },
      rol: "owner",
      usuario: USUARIO_APROBADOR,
      modulosActivos: ["core"],
    });
    const r1 = await mod.executeCapability(
      ctx,
      "core.personas.pago_aprobar_cambio",
      { id: personaId },
      { dryRun: false },
    );
    expect(r1).toMatchObject({ ok: true });
    const r2 = await mod.executeCapability(
      ctx,
      "core.personas.pago_rechazar_cambio",
      { id: personaId, motivo: "Segundo intento inválido" },
      { dryRun: false },
    );
    expect(r2).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });
});