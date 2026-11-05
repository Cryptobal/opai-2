import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla } from "../capabilities/fixtures";
import { capacidades } from "../capabilities/index";
import { mockMotorLegal } from "./mock-motor-legal";
import { exigirGatesEnvioCpq } from "./propuesta-envio-aprobacion";
import { exigirVersionEsperada, leerVersionEsperada } from "./version-esperada";

const cambioDuranteValidacion = vi.hoisted(() => ({ hacer: null as null | (() => Promise<void>) }));
vi.mock("../capabilities/enviar-validar", () => ({
  validarEnvioCpq: async () => {
    await cambioDuranteValidacion.hacer?.();
  },
}));

beforeAll(() => registrarCapacidades(capacidades));

describe("huella del envío (CAR-192 N2)", () => {
  it("se toma antes de calcular y validar: un cambio durante la validación hace fallar el envío", async () => {
    mockMotorLegal();
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: [...GESTOR, ...CON_COSTOS] });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Huella" });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f.ok) throw new Error("ficha");
    const sec = (f.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", { seccionId: sec.id, tipo: "puesto", nombre: "Turno", sueldoBaseClp: 650_000 });
    const v = (await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } }))!;
    await ctx.db.cpqVersion.updateMany({ where: { id: v.id }, data: { estado: "lista" } });
    const antes = (await leerVersionEsperada(ctx.db, v.id))!;

    cambioDuranteValidacion.hacer = async () => {
      await ctx.db.cpqLinea.updateMany({ where: { seccionId: sec.id }, data: { nombre: "Turno editado" } });
    };
    const r = await exigirGatesEnvioCpq(ctx, id, undefined, true);
    cambioDuranteValidacion.hacer = null;

    expect(r.versionEsperada.huella).toBe(antes.huella);
    await expect(exigirVersionEsperada(ctx.db, v.id, r.versionEsperada)).rejects.toThrow(/cambió/);
  });
});
