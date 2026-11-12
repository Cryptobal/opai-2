import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearContexto, executeCapability } from "../src";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

// CAR-277: la ficha trae el nombre de la instalación del contrato vigente para la cabecera «Cargo · Instalación».
describe("core.personas.get: instalación del contrato vigente", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  const ctx = () => crearContexto({ tenantId: f.tenantId, rol: "owner", actor: { tipo: "system" } });
  beforeAll(async () => {
    f = await prepararVinculosJornada();
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });

  it("sin contrato vigente no hay instalación; con contrato trae su nombre", async () => {
    const sin = await executeCapability(ctx(), "core.personas.get", { id: f.personaId });
    expect(sin.ok && (sin.data as { vinculoVigente: unknown }).vinculoVigente).toBeNull();
    await f.e.forTenant(f.tenantId).vinculoLaboral.create({
      data: { tenantId: f.tenantId, personaId: f.personaId, cargoId: f.cargoId, instalacionId: f.a, tipo: "indefinido", inicio: new Date("2026-03-01T00:00:00Z"), horasSemanales: 44, distribucion: "5x2 de 8 horas", estado: "vigente" },
    });
    const con = await executeCapability(ctx(), "core.personas.get", { id: f.personaId });
    const v = con.ok ? (con.data as { vinculoVigente: { instalacion?: string; cargo: string } }).vinculoVigente : null;
    expect(v?.instalacion).toBe("Norte");
    expect(v?.cargo).toBe("Guardia");
  });
});
