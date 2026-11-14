// CAR-344: los datos de `nomina.costo_proyectado.listar` (vínculos, capas de sueldo, previsión y anticipos)
// se leen con la RLS del tenant: el owner de A nunca suma personas ni sueldos de B. Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type * as Datos from "../src/nomina/costo-proyectado-datos";

describe.skipIf(!urlPropietario)("aislamiento entre tenants · costo proyectado de Nómina (RLS)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let datos: typeof Datos;
  let tenantA = "";
  let tenantB = "";
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["nomina"], medidor });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    datos = await import("../src/nomina/costo-proyectado-datos");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesNomina]);
    const tenant = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } })).id;
    tenantA = await tenant("costo-a");
    tenantB = await tenant("costo-b");
    const sembrar = async (tenantId: string, n: number) => {
      const cargo = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
      for (let i = 0; i < n; i++) {
        const personaId = (await e.admin.persona.create({ data: { tenantId, nombres: "P", apellidos: `${i}`, rut: `${n}${i}.111.111-1`, estado: "activa" } })).id;
        await e.admin.vinculoLaboral.create({ data: { tenantId, personaId, cargoId: cargo, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente" } });
        await e.admin.estructuraSueldo.create({
          data: { tenantId, nivel: "persona", personaId, sueldoBase: 600_000, colacion: 0, movilizacion: 0, gratificacion: "legal_25", vigenteDesde: new Date("2026-01-01"), motivo: "prueba" },
        });
        await e.admin.nominaReglaAnticipo.create({ data: { tenantId, personaId, activa: true, modo: "monto_fijo", valor: 50_000, diaMes: 15 } });
      }
    };
    await sembrar(tenantA, 1);
    await sembrar(tenantB, 3);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada tenant lee solo sus vínculos, capas y anticipos", async () => {
    const a = await datos.cargarBase(ctx(tenantA), "2026-11-01", "2026-12-31");
    const b = await datos.cargarBase(ctx(tenantB), "2026-11-01", "2026-12-31");
    expect([a.vinculos.length, a.estructuras.length, a.anticipos.length]).toEqual([1, 1, 1]);
    expect([b.vinculos.length, b.estructuras.length, b.anticipos.length]).toEqual([3, 3, 3]);
    const personasB = new Set(b.vinculos.map((v) => v.personaId));
    expect(a.vinculos.some((v) => personasB.has(v.personaId))).toBe(false);
  });
});
