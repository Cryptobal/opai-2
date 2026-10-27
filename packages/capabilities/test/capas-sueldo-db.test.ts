import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import {
  capacidadesDelNucleo,
  crearContexto,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";

describe.skipIf(!urlPropietario)("07b: capacidades con RLS y concurrencia reales", () => {
  let e: Entorno;
  let tenantId: string;
  let otro: string;
  let instalacionId: string;
  const contexto = (tenant: string) =>
    crearContexto({
      tenantId: tenant,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });
  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarRegistro();
    registrarCapacidades(capacidadesDelNucleo);
    const crear = async () => {
      const slug = `07b-${randomUUID()}`;
      return (
        await e.admin.tenant.create({ data: { slug, nombre: "Ejemplo", vertical: "seguridad" } })
      ).id;
    };
    tenantId = await crear();
    otro = await crear();
    const cuenta = await e
      .forTenant(tenantId)
      .cuenta.create({ data: { tenantId, nombre: "Ejemplo" } });
    instalacionId = (
      await e
        .forTenant(tenantId)
        .instalacion.create({ data: { tenantId, cuentaId: cuenta.id, nombre: "Ejemplo" } })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  const entrada = () => ({
    nivel: "instalacion",
    instalacionId,
    sueldoBase: 600000,
    colacion: 0,
    movilizacion: 0,
    gratificacion: "ninguna",
    vigenteDesde: "2026-01-01",
  });
  it("preview no persiste y otro tenant no puede leer ni escribir", async () => {
    const r = await executeCapability(contexto(tenantId), "core.estructuras.create", entrada(), {
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    expect(await e.forTenant(tenantId).estructuraSueldo.count()).toBe(0);
    const ajeno = await executeCapability(contexto(otro), "core.estructuras.create", entrada());
    expect(ajeno).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
  it("dos versiones concurrentes de la misma fecha no se solapan", async () => {
    const resultados = await Promise.all(
      [0, 1].map(() => executeCapability(contexto(tenantId), "core.estructuras.create", entrada())),
    );
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    const filas = await e.forTenant(tenantId).estructuraSueldo.findMany();
    expect(filas).toHaveLength(1);
    const id = filas[0]!.id;
    expect(await executeCapability(contexto(otro), "core.estructuras.get", { id })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    const previa = await executeCapability(
      contexto(tenantId),
      "core.estructuras.anular",
      { id, motivo: "Corrección de prueba" },
      { dryRun: true },
    );
    expect(previa.ok).toBe(true);
    expect(
      (await e.forTenant(tenantId).estructuraSueldo.findFirst({ where: { id } }))?.estado,
    ).toBe("vigente");
    const auditoria = await e
      .forTenant(tenantId)
      .auditEvent.count({ where: { capability: "core.estructuras.create" } });
    expect(auditoria).toBe(1);
  });
});
