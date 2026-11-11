import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

const nueva = {
  nombre: "Contrato indefinido",
  clase: "contrato_trabajo",
  nivelFirma: "N2",
  contenido: "{persona.nombre}, RUT {persona.rut}, ingresa el {vinculo.inicio}.",
};

type Plantilla = {
  id: string;
  nombre: string;
  tipo: string;
  versionVigente: number;
  activa: boolean;
};

describe("core.documento_plantillas.*", () => {
  it("crea con versión 1, la lista con su tipo y la lee con su texto", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin" });
    const p = await dato<Plantilla>(ctx, "core.documento_plantillas.create", nueva);
    expect(p).toMatchObject({
      nombre: "Contrato indefinido",
      tipo: "Contrato de trabajo",
      versionVigente: 1,
    });
    const lista = await dato<Plantilla[]>(ctx, "core.documento_plantillas.list", {});
    expect(lista.map((x) => x.nombre)).toEqual(["Contrato indefinido"]);
    const una = await dato<{ contenido: string }>(ctx, "core.documento_plantillas.get", {
      id: p.id,
    });
    expect(una.contenido).toBe(nueva.contenido);
  });

  it("dryRun no escribe", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner" });
    await dato(ctx, "core.documento_plantillas.create", nueva, { dryRun: true });
    expect(await dato<Plantilla[]>(ctx, "core.documento_plantillas.list", {})).toEqual([]);
  });

  it("solo owner y admin: gerente, supervisor y viewer quedan fuera", async () => {
    for (const rol of ["gerente", "supervisor", "viewer"] as const) {
      const { ctx } = contextoDePrueba({ rol });
      expect(await codigo(ctx, "core.documento_plantillas.list", {})).toBe("FORBIDDEN");
      expect(await codigo(ctx, "core.documento_plantillas.create", nueva)).toBe("FORBIDDEN");
    }
    for (const rol of ["owner", "admin"] as const) {
      const { ctx } = contextoDePrueba({ rol });
      expect(await codigo(ctx, "core.documento_plantillas.list", {})).toBe("OK");
    }
  });

  it("rechaza N1 en contrato (mínimo legal N2), N3 y variables fuera del catálogo", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin" });
    const c = (extra: object) =>
      codigo(ctx, "core.documento_plantillas.create", { ...nueva, ...extra });
    expect(await c({ nivelFirma: "N1" })).toBe("UNPROCESSABLE");
    expect(await c({ nivelFirma: "N3" })).toBe("INVALID_INPUT");
    expect(await c({ contenido: "Cuenta {banco.numero}" })).toBe("UNPROCESSABLE");
    expect(await c({ clase: "propuesta_comercial" })).toBe("INVALID_INPUT");
  });

  it("acepta N1 en una recepción y no repite nombres", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin" });
    const recepcion = {
      nombre: "Recepción de uniforme",
      clase: "recepcion_laboral",
      nivelFirma: "N1",
    };
    await dato(ctx, "core.documento_plantillas.create", recepcion);
    expect(await codigo(ctx, "core.documento_plantillas.create", recepcion)).toBe("CONFLICT");
  });

  it("actualiza nombre y firma, valida la clase y archiva", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin" });
    const p = await dato<Plantilla>(ctx, "core.documento_plantillas.create", nueva);
    const u = (i: object) => codigo(ctx, "core.documento_plantillas.update", { id: p.id, ...i });
    expect(await u({ nivelFirma: "N1" })).toBe("UNPROCESSABLE");
    expect(await u({ nombre: "Contrato plazo indefinido" })).toBe("OK");
    expect(await u({ activa: false })).toBe("OK");
    expect(await dato<Plantilla[]>(ctx, "core.documento_plantillas.list", {})).toEqual([]);
    const todas = await dato<Plantilla[]>(ctx, "core.documento_plantillas.list", {
      incluirInactivas: true,
    });
    expect(todas.map((x) => [x.nombre, x.activa])).toEqual([["Contrato plazo indefinido", false]]);
  });

  it("una plantilla inexistente es NOT_FOUND", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin" });
    const id = "0193a000-0000-7000-8000-000000000000";
    expect(await codigo(ctx, "core.documento_plantillas.get", { id })).toBe("NOT_FOUND");
    expect(await codigo(ctx, "core.documento_plantillas.update", { id, activa: false })).toBe(
      "NOT_FOUND",
    );
  });
});
