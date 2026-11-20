import { beforeEach, describe, expect, it } from "vitest";
import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});
const datos = <T>(r: { ok: boolean; data?: unknown }): T => {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data as T;
};
type Pagina = {
  items: { id: string; nombre: string; instalaciones: number }[];
  siguiente: string | null;
};

describe("cuentas con instalaciones (CAR-662)", () => {
  it("filtra antes del límite y pagina sólo coincidencias, sin contar instalaciones archivadas", async () => {
    const { ctx, tabla } = contextoDePrueba();
    for (let n = 0; n < 43; n++) {
      const { id } = datos<{ id: string }>(
        await executeCapability(ctx, "core.cuentas.create", {
          nombre: `Cuenta ${String(n).padStart(2, "0")}`,
        }),
      );
      if (n >= 21)
        tabla("instalacion").push({
          id: `i${n}`,
          tenantId: ctx.tenantId,
          cuentaId: id,
          nombre: "Planta",
          estado: "activa",
          archivadaEn: n === 21 ? new Date() : null,
        });
    }
    const p1 = datos<Pagina>(
      await executeCapability(ctx, "core.cuentas.list", {
        conInstalaciones: true,
        limite: 20,
      }),
    );
    expect(p1.items).toHaveLength(20);
    expect(p1.items[0]?.nombre).toBe("Cuenta 22");
    expect(p1.items.every((c) => c.instalaciones === 1)).toBe(true);
    expect(p1.siguiente).not.toBeNull();
    const p2 = datos<Pagina>(
      await executeCapability(ctx, "core.cuentas.list", {
        conInstalaciones: true,
        limite: 20,
        cursor: p1.siguiente,
      }),
    );
    expect(p2.items.map((c) => c.nombre)).toEqual(["Cuenta 42"]);
    expect(p2.siguiente).toBeNull();
    const sinFiltro = datos<Pagina>(
      await executeCapability(ctx, "core.cuentas.list", {
        conInstalaciones: false,
        limite: 20,
      }),
    );
    expect(sinFiltro.items[0]?.nombre).toBe("Cuenta 00");
  });

  it("exige una instalación no archivada dentro del alcance, no una ajena de la misma cuenta", async () => {
    const { ctx, tabla } = contextoDePrueba();
    const { id } = datos<{ id: string }>(
      await executeCapability(ctx, "core.cuentas.create", { nombre: "Cuenta" }),
    );
    for (const [idInstalacion, archivadaEn] of [
      ["asignada", new Date()],
      ["ajena", null],
    ] as const) {
      tabla("instalacion").push({
        id: idInstalacion,
        tenantId: ctx.tenantId,
        cuentaId: id,
        nombre: "Planta",
        estado: "activa",
        archivadaEn,
      });
    }
    const limitado = { ...ctx, alcance: { instalaciones: ["asignada"] } };
    expect(
      datos<Pagina>(
        await executeCapability(limitado, "core.cuentas.list", {
          conInstalaciones: true,
        }),
      ).items,
    ).toEqual([]);
    tabla("instalacion")[0]!["archivadaEn"] = null;
    expect(
      datos<Pagina>(
        await executeCapability(limitado, "core.cuentas.list", {
          conInstalaciones: true,
        }),
      ).items,
    ).toMatchObject([{ id, instalaciones: 1 }]);
    expect(
      datos<Pagina>(
        await executeCapability({ ...ctx, alcance: { instalaciones: [] } }, "core.cuentas.list", {
          conInstalaciones: true,
        }),
      ).items,
    ).toEqual([]);
  });
});
