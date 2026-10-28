import { destinoVinculo } from "./vinculo-fixture";
import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

async function base() {
  const p = contextoDePrueba();
  const { id: cargoId } = await dato<{ id: string }>(p.ctx, "core.cargos.create", {
    nombre: "Guardia",
  });
  return { ...p, cargoId };
}

const maria = { nombres: "María Fernanda", apellidos: "Soto", rut: "16.234.567-2" };

describe("core.personas.* y core.vinculos.*", () => {
  it("crea con vínculo inicial en una transacción y emite ambos eventos", async () => {
    const { ctx, cargoId, tabla } = await base();
    const vinculo = { ...(await destinoVinculo(ctx)), cargoId, tipo: "indefinido", inicio: "2025-03-03" };
    const p = await dato<{ id: string; rut: string; vinculoVigente: { cargo: string } }>(
      ctx,
      "core.personas.create",
      { ...maria, vinculo },
    );
    expect(p.rut).toBe("16234567-2");
    expect(p.vinculoVigente.cargo).toBe("Guardia");
    expect(tabla("evento").map((e) => e["tipo"])).toEqual([
      "core.cargo.creado",
      "core.vinculo.creado",
      "core.persona.creada",
    ]);
    expect(await codigo(ctx, "core.personas.create", { ...maria, rut: "16234567-2" })).toBe(
      "CONFLICT",
    );
    const lista = await dato<{ items: { nombreCompleto: string }[] }>(ctx, "core.personas.list", {
      q: "16234",
    });
    expect(lista.items.map((x) => x.nombreCompleto)).toEqual(["María Fernanda Soto"]);
    const porCargo = await dato<{ items: unknown[] }>(ctx, "core.personas.list", { cargoId });
    expect(porCargo.items).toHaveLength(1);
  });

  it("un solo vínculo vigente; terminar es irreversible y deja a la persona inactiva", async () => {
    const { ctx, cargoId } = await base();
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", maria);
    const v = await dato<{ id: string }>(ctx, "core.vinculos.create", {
      ...(await destinoVinculo(ctx)),
      personaId: id,
      cargoId,
      tipo: "plazo_fijo",
      inicio: "2026-09-01",
      termino: "2026-11-30",
    });
    expect(
      await codigo(ctx, "core.vinculos.create", {
      ...(await destinoVinculo(ctx)),
        personaId: id,
        cargoId,
        tipo: "indefinido",
        inicio: "2026-10-01",
      }),
    ).toBe("UNPROCESSABLE");
    expect(await codigo(ctx, "core.personas.archive", { id })).toBe("UNPROCESSABLE");
    expect(
      await codigo(ctx, "core.vinculos.terminar", {
        id: v.id,
        termino: "2026-08-01",
        motivo: "Fin de faena",
      }),
    ).toBe("UNPROCESSABLE");
    expect(
      await dato(ctx, "core.vinculos.terminar", {
        id: v.id,
        termino: "2026-10-15",
        motivo: "Renuncia voluntaria",
      }),
    ).toMatchObject({ estado: "terminado" });
    expect(await dato(ctx, "core.personas.get", { id })).toMatchObject({
      estado: "inactiva",
      vinculoVigente: null,
    });
    expect(await dato(ctx, "core.personas.archive", { id })).toMatchObject({
      archivadaEn: expect.any(String),
    });
  });

  it("bloquear exige motivo y aparece en el filtro de bloqueadas", async () => {
    const { ctx } = await base();
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", maria);
    expect(await codigo(ctx, "core.personas.bloquear", { id, motivo: "" })).toBe("INVALID_INPUT");
    await dato(ctx, "core.personas.bloquear", { id, motivo: "OS-10 vencido" });
    const b = await dato<{ items: { bloqueoMotivo: string }[] }>(ctx, "core.personas.list", {
      estado: "bloqueada",
    });
    expect(b.items.map((x) => x.bloqueoMotivo)).toEqual(["OS-10 vencido"]);
    await dato(ctx, "core.personas.desbloquear", { id, motivo: "Renovó la credencial" });
    expect(await dato(ctx, "core.personas.get", { id })).toMatchObject({ bloqueada: false });
  });

  it("vincular usuario exige membresía activa y es 1:1", async () => {
    const { ctx, tabla } = await base();
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", maria);
    const usuarioId = "0192f3a0-0000-7000-8000-0000000000c1";
    expect(await codigo(ctx, "core.personas.vincular_usuario", { id, usuarioId })).toBe(
      "UNPROCESSABLE",
    );
    tabla("membership").push({
      id: "m",
      tenantId: ctx.tenantId,
      userId: usuarioId,
      estado: "activa",
    });
    await dato(ctx, "core.personas.vincular_usuario", { id, usuarioId });
    const otra = await dato<{ id: string }>(ctx, "core.personas.create", {
      ...maria,
      rut: "12.345.678-5",
    });
    expect(await codigo(ctx, "core.personas.vincular_usuario", { id: otra.id, usuarioId })).toBe(
      "CONFLICT",
    );
  });
});
