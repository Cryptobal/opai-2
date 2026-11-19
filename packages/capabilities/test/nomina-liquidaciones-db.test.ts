// Brief 27 (CAR-99): `nomina.liquidaciones` con Postgres real. La RLS impide leer liquidaciones de otro
// tenant, aun con el id, y el trigger de mismo tenant impide colgar una liquidación de una persona ajena.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("aislamiento entre tenants · liquidaciones (RLS)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { a: "", b: "" };
  const per = { a: "", b: "" };
  const pers = { a: "", b: "" };
  const capa = { a: "", b: "" };
  let liqB = "";
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["nomina"], medidor });
  const run = (tenantId: string, id: string, input: unknown) => mod.executeCapability(ctx(tenantId), id, input);
  const fila = (k: "a" | "b") => ({
    tenantId: t[k], periodoId: per[k], personaId: pers[k], capaId: capa[k], diasTrabajados: 30, haberes: 700_000, imponible: 690_000,
    descuentosLegales: 120_000, otrosDescuentos: 0, liquido: 580_000, costoEmpresa: 900_000, detalle: {}, juegoHuella: "h",
  });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesNomina]);
    for (const k of ["a", "b"] as const) {
      t[k] = (await e.admin.tenant.create({ data: { slug: `liq-${k}-${randomUUID().slice(0, 8)}`, nombre: k, vertical: "seguridad" } })).id;
      pers[k] = (await e.admin.persona.create({ data: { tenantId: t[k], nombres: "P", apellidos: k, rut: `${k === "a" ? 1 : 2}1.111.111-1`, estado: "activa" } })).id;
      per[k] = (await e.admin.nominaPeriodo.create({
        data: { tenantId: t[k], anio: 2026, mes: 11, inicio: new Date("2026-11-01"), fin: new Date("2026-11-30"), cierrePrevisto: new Date("2026-11-30") },
      })).id;
      capa[k] = (await e.admin.estructuraSueldo.create({
        data: { tenantId: t[k], nivel: "persona", personaId: pers[k], sueldoBase: 600_000, colacion: 0, movilizacion: 0, gratificacion: "legal_25", vigenteDesde: new Date("2026-01-01"), motivo: "prueba" },
      })).id;
    }
    liqB = (await e.admin.nominaLiquidacion.create({ data: fila("b") })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("el owner de A no ve la liquidación de B por la lista ni por id", async () => {
    expect(await run(t.a, "nomina.liquidaciones.obtener", { id: liqB })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await run(t.a, "nomina.liquidaciones.listar", { periodoId: per.b })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const b = await run(t.b, "nomina.liquidaciones.listar", { periodoId: per.b });
    expect(b.ok && (b.data as { items: { id: string }[] }).items.map((i) => i.id)).toEqual([liqB]);
  });

  it("no se puede colgar una liquidación de A con la persona de B", async () => {
    await expect(e.admin.nominaLiquidacion.create({ data: { ...fila("a"), personaId: pers.b } })).rejects.toThrow();
  });
});
