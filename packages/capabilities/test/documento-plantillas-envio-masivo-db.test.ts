import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearContexto, executeCapability } from "../src";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

describe("plantillas laborales: envío masivo", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  let plantillaId = "";
  const almacen = almacenamientoEnMemoria();
  const ctx = (rol: "owner" | "gerente" = "owner") =>
    crearContexto({ tenantId: f.tenantId, rol, actor: { tipo: "system" }, servicios: { almacenamiento: almacen.almacenamiento } });

  beforeAll(async () => {
    f = await prepararVinculosJornada();
    const r = await executeCapability(ctx(), "core.documento_plantillas.create", {
      nombre: "Anexo masivo",
      clase: "anexo_contrato",
      nivelFirma: "N2",
      firmantes: "trabajador",
      contenido: "Anexo para {persona.nombre}, RUT {persona.rut}, domicilio {persona.direccion}.",
    });
    if (!r.ok) throw new Error(JSON.stringify(r));
    plantillaId = (r.data as { id: string }).id;
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });

  it("lista candidatas y marca faltantes", async () => {
    const r = await executeCapability(ctx(), "core.documento_plantillas.candidatas", { plantillaId });
    expect(r.ok).toBe(true);
    const d = r.ok ? (r.data as { items: { personaId: string; puedeGenerar: boolean }[] }) : { items: [] };
    expect(d.items.some((p) => p.personaId === f.personaId)).toBe(true);
    expect(d.items.find((p) => p.personaId === f.personaId)?.puedeGenerar).toBe(false);
  });

  it("dryRun del lote no guarda documentos", async () => {
    await f.e.forTenant(f.tenantId).persona.update({
      where: { id: f.personaId },
      data: { calle: "Av. Matta 123", comuna: "Santiago", emailPersonal: "trabajo@ejemplo.cl" },
    });
    const c = await executeCapability(ctx(), "core.documento_plantillas.candidatas", { plantillaId });
    const id = (c.ok ? (c.data as { items: { personaId: string; puedeGenerar: boolean }[] }).items : []).find(
      (p) => p.puedeGenerar,
    )?.personaId;
    expect(id).toBeTruthy();
    const antes = await f.e.admin.documento.count({ where: { tenantId: f.tenantId } });
    const r = await executeCapability(
      ctx(),
      "core.documento_plantillas.enviar_masivo",
      { plantillaId, personaIds: [id!] },
      { dryRun: true },
    );
    expect(r.ok).toBe(true);
    const despues = await f.e.admin.documento.count({ where: { tenantId: f.tenantId } });
    expect(despues).toBe(antes);
  });

  it("un error en una persona no frena a la otra", async () => {
    const r = await executeCapability(ctx(), "core.documento_plantillas.enviar_masivo", {
      plantillaId,
      personaIds: [f.personaId, "00000000-0000-4000-8000-000000000099"],
    });
    expect(r.ok).toBe(true);
    const d = r.ok ? (r.data as { exitosas: number; fallidas: number }) : { exitosas: 0, fallidas: 0 };
    expect(d.exitosas).toBe(1);
    expect(d.fallidas).toBe(1);
  });
});