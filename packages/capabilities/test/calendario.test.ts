import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";
import { semillaTenant } from "./semilla";

beforeEach(reiniciar);

type DiaVista = {
  id: string;
  fecha: string;
  nombre: string;
  fuente: string;
  irrenunciable: boolean;
  editable: boolean;
};

describe("core.calendario.* (validación y escritura)", () => {
  it("preview de crear_feriado muestra el efecto sin escribir (fuente tenant, editable)", async () => {
    const { ctx } = contextoDePrueba({ semilla: semillaTenant() });
    const prev = await dato<DiaVista>(
      ctx,
      "core.calendario.crear_feriado",
      { fecha: "2026-11-20", nombre: "Aniversario" },
      { dryRun: true },
    );
    expect(prev).toMatchObject({
      fecha: "2026-11-20",
      nombre: "Aniversario",
      fuente: "tenant",
      editable: true,
    });
    expect(prev.id).toBe("");
  });

  it("rechaza una fecha inexistente", async () => {
    const { ctx } = contextoDePrueba({ semilla: semillaTenant() });
    expect(await codigo(ctx, "core.calendario.crear_feriado", { fecha: "2026-13-40", nombre: "X" })).toBe(
      "INVALID_INPUT",
    );
  });

  it("crea un feriado del tenant y lo deja editable", async () => {
    const { ctx } = contextoDePrueba({ semilla: semillaTenant() });
    const creado = await dato<DiaVista>(ctx, "core.calendario.crear_feriado", {
      fecha: "2026-11-20",
      nombre: "Aniversario",
      irrenunciable: true,
    });
    expect(creado.id).not.toBe("");
    expect(creado).toMatchObject({ fuente: "tenant", irrenunciable: true, editable: true });
  });

  it("no deja editar ni archivar un feriado de plataforma (tenant_id nulo)", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semillaTenant() });
    tabla("diaCalendario").push({
      id: "018f0000-0000-7000-8000-0000000000f1",
      tenantId: null,
      fecha: new Date("2026-09-18T00:00:00.000Z"),
      tipo: "feriado",
      nombre: "Independencia",
      irrenunciable: true,
      region: null,
      instalacionId: null,
      fuente: "nacional",
      archivadaEn: null,
    });
    const id = "018f0000-0000-7000-8000-0000000000f1";
    expect(await codigo(ctx, "core.calendario.actualizar", { id, nombre: "Otro" })).toBe("NOT_FOUND");
    expect(await codigo(ctx, "core.calendario.archivar", { id })).toBe("NOT_FOUND");
  });
});
