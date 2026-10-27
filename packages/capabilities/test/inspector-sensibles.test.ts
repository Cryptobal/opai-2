import { beforeEach, describe, expect, it, vi } from "vitest";

import { PLANTILLAS } from "../../db/scripts/roles-base-plantillas";
import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

async function preparar() {
  const owner = contextoDePrueba();
  const { id: cargoId } = await dato<{ id: string }>(owner.ctx, "core.cargos.create", {
    nombre: "Cargo sensible de prueba",
    sueldoSensible: true,
  });
  const estructura = await dato<{ id: string }>(owner.ctx, "core.estructuras.create", {
    nivel: "cargo",
    cargoId,
    sueldoBase: 3_000_000,
    vigenteDesde: "2026-01-01",
    items: [{ tipo: "bono_fijo", nombre: "Bono", monto: 50_000 }],
  });
  const permisosRol = PLANTILLAS.find((p) => p.nombre === "Inspector DT")?.permisos;
  if (!permisosRol) throw new Error("Falta Inspector DT");
  const inspector = contextoDePrueba({ rol: "supervisor", permisosRol });
  const ctx = { ...owner.ctx, actor: inspector.ctx.actor, autorizar: inspector.ctx.autorizar };
  owner.eventos.length = 0;
  return { ...owner, ctx, cargoId, estructura };
}

describe("Inspector DT: lectura sensible auditada (t479u; art. 31 DFL 2/1967)", () => {
  it("ve los montos completos en get, list y resumen de cargos y audita cada lectura", async () => {
    const { ctx, eventos, cargoId, estructura } = await preparar();
    const visto = await dato(ctx, "core.estructuras.get", { id: estructura.id });
    expect(visto).toMatchObject({
      sueldoBase: 3_000_000,
      sensible: false,
      items: [expect.objectContaining({ monto: 50_000 })],
    });
    await dato(ctx, "core.estructuras.list", { nivel: "cargo", refId: cargoId });
    await dato(ctx, "core.cargos.list", {});
    expect(
      eventos
        .filter((e) => e.capability !== "core.estructuras.read_sensible")
        .map((e) => e.capability),
    ).toEqual(["core.estructuras.get", "core.estructuras.list"]);
    const sensibles = eventos.filter((e) => e.capability === "core.estructuras.read_sensible");
    expect(sensibles).toHaveLength(3);
    for (const e of sensibles)
      expect(e).toMatchObject({
        tenantId: ctx.tenantId,
        actor: ctx.actor,
        capability: "core.estructuras.read_sensible",
        entityType: "estructura",
        entityId: estructura.id,
      });
    expect(JSON.stringify(eventos)).not.toContain("3000000");
  });

  it("no puede crear ni anular estructuras ni concederse permisos", async () => {
    const { ctx, eventos, cargoId, estructura } = await preparar();
    expect(
      await codigo(ctx, "core.estructuras.create", {
        nivel: "cargo",
        cargoId,
        sueldoBase: 1,
        vigenteDesde: "2027-01-01",
      }),
    ).toBe("FORBIDDEN");
    expect(
      await codigo(ctx, "core.estructuras.anular", {
        id: estructura.id,
        motivo: "Prueba negativa",
      }),
    ).toBe("FORBIDDEN");
    expect(eventos).toHaveLength(0);
  });

  it("sin read_sensible oculta los montos y no registra una revelación", async () => {
    const { ctx, eventos, estructura } = await preparar();
    const sinPermiso = {
      ...ctx,
      autorizar: (p: string) => p !== "core:estructuras.read_sensible" && ctx.autorizar(p),
    };
    expect(await dato(sinPermiso, "core.estructuras.get", { id: estructura.id })).toMatchObject({
      sueldoBase: null,
      sensible: true,
    });
    expect(eventos).toEqual([
      expect.objectContaining({
        capability: "core.estructuras.get",
        payload: { ids: [estructura.id] },
      }),
    ]);
  });

  it("la estructura efectiva devuelve haberes completos y audita el nivel sensible", async () => {
    const { ctx, eventos, cargoId } = await preparar();
    const { id: personaId } = await dato<{ id: string }>(
      { ...ctx, autorizar: () => true },
      "core.personas.create",
      {
        nombres: "Persona",
        apellidos: "Prueba",
        rut: "19.876.543-0",
        vinculo: { cargoId, tipo: "indefinido", inicio: "2026-01-01" },
      },
    );
    const estructura = await dato<{ id: string }>(
      { ...ctx, autorizar: () => true },
      "core.estructuras.create",
      {
        nivel: "persona",
        personaId,
        sueldoBase: 3_000_000,
        colacion: 0,
        movilizacion: 0,
        gratificacion: "legal_25",
        motivo: "Acuerdo de prueba",
        vigenteDesde: "2026-01-01",
        items: [{ tipo: "bono_fijo", nombre: "Bono", monto: 50_000 }],
      },
    );
    eventos.length = 0;
    const r = await dato(ctx, "core.estructuras.efectiva", {
      personaId,
      fecha: "2026-10-01",
      imm: 529_000,
    });
    expect(r).toMatchObject({
      niveles: { persona: { sueldoBase: 3_000_000, sensible: false }, cargo: null },
      haberes: expect.any(Object),
    });
    expect(eventos).toEqual([
      expect.objectContaining({
        capability: "core.estructuras.read_sensible",
        entityId: estructura.id,
      }),
      expect.objectContaining({
        capability: "core.estructuras.efectiva",
        payload: { ids: [estructura.id] },
      }),
    ]);
  });

  it("el historial también queda auditado y un fallo de auditoría impide revelar montos", async () => {
    const { ctx, eventos, estructura } = await preparar();
    await dato(ctx, "core.actividad.list", { capability: "core.estructuras.create" });
    expect(eventos).toEqual([
      expect.objectContaining({
        capability: "core.estructuras.read_sensible",
        entityType: "audit_event",
      }),
      expect.objectContaining({
        capability: "core.actividad.list",
        payload: { ids: [expect.any(String)] },
      }),
    ]);
    const fallo = {
      ...ctx,
      auditoria: {
        ...ctx.auditoria,
        registrar: vi.fn().mockRejectedValue(new Error("Sin auditoría")),
      },
    };
    expect(await codigo(fallo, "core.estructuras.get", { id: estructura.id })).toBe("INTERNAL");
  });
});
