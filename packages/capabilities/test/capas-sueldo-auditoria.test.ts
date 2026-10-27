import { beforeEach, describe, expect, it } from "vitest";
import { contextoDePrueba } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);
const completa = {
  sueldoBase: 600000,
  colacion: 0,
  movilizacion: 0,
  gratificacion: "ninguna",
  vigenteDesde: "2026-01-01",
};
async function preparar() {
  const p = contextoDePrueba();
  const c = await dato<{ id: string }>(p.ctx, "core.cuentas.create", { nombre: "Prueba" });
  const refs = [];
  for (const nombre of ["Norte", "Sur", "Centro"]) {
    const i = await dato<{ id: string }>(p.ctx, "core.instalaciones.create", {
      cuentaId: c.id,
      nombre,
    });
    const e = await dato<{ id: string }>(p.ctx, "core.estructuras.create", {
      ...completa,
      nivel: "instalacion",
      instalacionId: i.id,
    });
    refs.push({ instalacionId: i.id, estructuraId: e.id });
  }
  p.eventos.splice(0);
  return { ...p, refs };
}

describe("07b: montos persistidos y referencias múltiples", () => {
  it("anulación real y preview ocultan montos sin permiso y auditan su revelación", async () => {
    const { ctx, eventos, refs } = await preparar();
    for (const dryRun of [true, false]) {
      const sinMontos = {
        ...ctx,
        autorizar: (p: string) => p !== "core:estructuras.read_sensible",
      };
      const idOculto = refs[0]!.estructuraId;
      eventos.splice(0);
      expect(
        await dato(
          sinMontos,
          "core.estructuras.anular",
          { id: idOculto, motivo: "Corrección de prueba" },
          { dryRun },
        ),
      ).toMatchObject({ sueldoBase: null, colacion: null, sensible: true });
      expect(eventos.filter((e) => e.capability === "core.estructuras.read_sensible")).toEqual([]);
      eventos.splice(0);
      const id = refs[1]!.estructuraId;
      expect(
        await dato(
          ctx,
          "core.estructuras.anular",
          { id, motivo: "Corrección de prueba" },
          { dryRun },
        ),
      ).toMatchObject({ sueldoBase: 600000 });
      expect(eventos).toContainEqual(
        expect.objectContaining({ capability: "core.estructuras.read_sensible", entityId: id }),
      );
    }
  });

  it("cada preview audita el id anterior correcto y oculta todas las diferencias sin permiso", async () => {
    const { ctx, eventos, refs } = await preparar();
    for (const ref of refs) {
      const input = {
        ...completa,
        nivel: "instalacion",
        instalacionId: ref.instalacionId,
        sueldoBase: 700000,
        vigenteDesde: "2026-02-01",
      };
      eventos.splice(0);
      const r = await dato<{ impacto: { diferencias: { antes: unknown }[] } }>(
        ctx,
        "core.estructuras.create",
        input,
        { dryRun: true },
      );
      expect(r.impacto.diferencias[0]?.antes).toBe(600000);
      expect(
        eventos
          .filter((e) => e.capability === "core.estructuras.read_sensible")
          .map((e) => e.entityId),
      ).toEqual([ref.estructuraId]);
      const sinMontos = {
        ...ctx,
        autorizar: (p: string) => p !== "core:estructuras.read_sensible",
      };
      eventos.splice(0);
      const oculto = await dato<{
        impacto: { diferencias: { antes: unknown; despues: unknown; diferencia: unknown }[] };
      }>(sinMontos, "core.estructuras.create", input, { dryRun: true });
      for (const d of oculto.impacto.diferencias)
        expect(d).toMatchObject({ antes: null, despues: null, diferencia: null });
      expect(eventos.filter((e) => e.capability === "core.estructuras.read_sensible")).toEqual([]);
    }
  });

  it("list y get auditan cada referencia real sin mezclar instalaciones", async () => {
    const { ctx, eventos, refs } = await preparar();
    for (const ref of refs) {
      for (const [capacidad, input] of [
        ["core.estructuras.list", { nivel: "instalacion", refId: ref.instalacionId }],
        ["core.estructuras.get", { id: ref.estructuraId }],
      ] as const) {
        eventos.splice(0);
        const salida = await dato<{ id: string } | { id: string }[]>(ctx, capacidad, input);
        expect(Array.isArray(salida) ? salida.map((e) => e.id) : [salida.id]).toEqual([
          ref.estructuraId,
        ]);
        expect(eventos).toContainEqual(
          expect.objectContaining({
            capability: capacidad,
            payload: expect.objectContaining({ ids: [ref.estructuraId] }),
          }),
        );
      }
    }
  });
});
