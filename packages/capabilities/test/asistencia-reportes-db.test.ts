// CAR-590: reportes DT con aislamiento entre dos empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/asistencia/manifest";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("Asistencia · reportes DT (Postgres real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const A = { tenant: "", persona: "" };
  const B = { tenant: "", persona: "" };

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["asistencia"],
      medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    for (const [slug, ref] of [
      ["rep-a", A],
      ["rep-b", B],
    ] as const) {
      const tenant = (await e.admin.tenant.create({ data: { slug: `qa-${slug}-${randomUUID().slice(0, 6)}`, nombre: slug, vertical: "seguridad" } })).id;
      const inst = (await e.admin.instalacion.create({
        data: {
          tenantId: tenant,
          cuentaId: (await e.admin.cuenta.create({ data: { tenantId: tenant, nombre: "C", rut: "76111111-1" } })).id,
          nombre: "Planta",
          lat: -33.4,
          lng: -70.6,
          geocercaM: 100,
        },
      })).id;
      const persona = (await e.admin.persona.create({
        data: { tenantId: tenant, nombres: "Ana", apellidos: slug, rut: `19.${slug.length}.000-1`, estado: "activo" },
      })).id;
      await e.admin.dia.create({
        data: {
          tenantId: tenant,
          personaId: persona,
          fecha: new Date("2026-10-15"),
          instalacionId: inst,
          tipoJornada: "ordinaria",
          estado: "presente",
          sigla: "J.O.",
          minutosTrabajados: 480,
          calculadoEn: new Date(),
        },
      });
      ref.tenant = tenant;
      ref.persona = persona;
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada empresa ve solo sus filas en el reporte de asistencia", async () => {
    const vista = async (tenant: string) =>
      mod.executeCapability(ctx(tenant), "asistencia.reportes.vista", {
        tipo: "asistencia",
        desde: "2026-10-01",
        hasta: "2026-10-31",
      }) as Promise<{ ok: boolean; data: { totalFilas: number } }>;
    const a = await vista(A.tenant);
    const b = await vista(B.tenant);
    expect(a.ok && b.ok).toBe(true);
    expect(a.data.totalFilas).toBe(1);
    expect(b.data.totalFilas).toBe(1);
  });
});