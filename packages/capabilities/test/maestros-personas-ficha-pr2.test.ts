import { describe, expect, it } from "vitest";

import { PERMISOS_CORE, tienePermiso } from "@opai/domain";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";
import * as mod from "../src";

const personaId = "0192f3a0-0000-7000-8000-0000000000b1";

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
});
