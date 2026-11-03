// CAR-157 (B3) · Corridas contra Postgres con el rol sin BYPASSRLS: lotes, solo completar vacíos,
// segunda corrida sin cambios, estado de la cuenta y reversión que deja la base como estaba.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { aplicarPorLotes, cerrarCorrida, iniciarCorrida } from "../../scripts/importar-opai1/corridas";
import { leerEstadoDestinoPorTenantId } from "../../scripts/importar-opai1/destino";
import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { revertirCorrida } from "../../scripts/importar-opai1/revertir";
import { type Entorno, prepararEntorno, urlPropietario } from "../entorno";
import { fixture } from "./memoria";

describe.skipIf(!urlPropietario)("Corridas de importación (CAR-157)", () => {
  let e: Entorno;
  let tenantId = "";
  let otro = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const sufijo = randomUUID().slice(0, 8);
    tenantId = (await e.admin.tenant.create({ data: { slug: `cor-${sufijo}`, nombre: "C", vertical: "seguridad" } })).id;
    otro = (await e.admin.tenant.create({ data: { slug: `cor-o-${sufijo}`, nombre: "O", vertical: "seguridad" } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  async function correr(datos = fixture()) {
    const estado = await leerEstadoDestinoPorTenantId(tenantId);
    const plan = calcularPlan(datos, estado, { modulosActivos: [] });
    const id = await iniciarCorrida(tenantId, { modo: "aplicar", origen: "fixtures" });
    const r = await aplicarPorLotes(tenantId, id, plan, 2);
    await cerrarCorrida(tenantId, id, "completada", r.aplicadas);
    return { id, r };
  }

  const foto = async () => ({
    cuentas: await e.admin.cuenta.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
    contactos: await e.admin.contacto.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
    instalaciones: await e.admin.instalacion.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
    externos: await e.admin.idExterno.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
  });

  it("completa solo vacíos, no escribe nulos, mapea estados y no rellena la razón social", async () => {
    const existente = await e.admin.cuenta.create({
      data: { tenantId, nombre: "Alfa existente", rut: "76111111-6", giro: "Giro propio", ciudad: "Santiago" },
    });
    const datos = fixture();
    const a1 = datos.accounts.find((a) => a.id === "acc-a1");
    const a6 = datos.accounts.find((a) => a.id === "acc-a6");
    if (!a1 || !a6) throw new Error("fixture incompleto");
    a1.giro = "Otro giro de 1.0";
    a1.city = null;
    a1.status = "client_active";
    a6.status = "client_inactive";
    a6.legalName = null;

    const antes = await foto();
    const { id, r } = await correr(datos);
    expect(r.aplicadas.cuentas).toBeGreaterThan(0);

    const a = await e.admin.cuenta.findUniqueOrThrow({ where: { id: existente.id } });
    expect(a.giro).toBe("Giro propio");
    expect(a.ciudad).toBe("Santiago");
    expect(a.estado).toBe("cliente_activo");
    const delta = await e.admin.cuenta.findFirstOrThrow({ where: { tenantId, rut: "76333333-7" } });
    expect(delta.estado).toBe("cliente_inactivo");
    expect(delta.razonSocial).toBeNull();

    // La segunda corrida no crea ni cambia nada.
    const segunda = await correr(datos);
    expect(segunda.r.aplicadas).toEqual({ cuentas: 0, contactos: 0, instalaciones: 0, programaciones: 0 });

    // Revertir la primera corrida con la segunda ya hecha: la segunda no tocó nada, así que se puede.
    const prueba = await revertirCorrida(tenantId, id, true);
    expect(prueba.bloqueadas).toEqual([]);
    const real = await revertirCorrida(tenantId, id, false);
    expect(real.revertida).toBe(true);
    const despues = await foto();
    expect(despues.cuentas).toEqual(antes.cuentas.map((c) => ({ ...c })).map((c) => expect.objectContaining({ id: c.id })));
    const restaurada = await e.admin.cuenta.findUniqueOrThrow({ where: { id: existente.id } });
    expect(restaurada.estado).toBe("prospecto");
    expect(restaurada.giro).toBe("Giro propio");
    expect(despues.cuentas).toHaveLength(1);
    expect(despues.contactos).toHaveLength(0);
    expect(despues.instalaciones).toHaveLength(0);
    expect(despues.externos).toHaveLength(0);
  });

  it("se niega a revertir si una fila se modificó después en 2.0", async () => {
    const { id } = await correr();
    const c = await e.admin.cuenta.findFirstOrThrow({ where: { tenantId, rut: "76333333-7" } });
    await e.admin.cuenta.update({ where: { id: c.id }, data: { notas: "editada a mano" } });
    const r = await revertirCorrida(tenantId, id, false);
    expect(r.revertida).toBe(false);
    expect(r.bloqueadas.length).toBeGreaterThan(0);
    expect(await e.admin.cuenta.count({ where: { tenantId } })).toBeGreaterThan(1);
  });

  it("se niega a revertir si hay dependientes en 2.0 creados después de la importación", async () => {
    const { id } = await correr();
    const c = await e.admin.cuenta.findFirstOrThrow({ where: { tenantId, rut: "76333333-7" } });
    const etiqueta = await e.admin.etiqueta.create({
      data: { tenantId, nombre: `et-${randomUUID().slice(0, 8)}` },
    });
    await e.admin.etiquetaAsignacion.create({ data: { tenantId, etiquetaId: etiqueta.id, cuentaId: c.id } });
    const prueba = await revertirCorrida(tenantId, id, true);
    expect(prueba.revertida).toBe(false);
    expect(prueba.bloqueadas.some((b) => b.motivo === "tiene_dependientes_en_2_0")).toBe(true);
    const real = await revertirCorrida(tenantId, id, false);
    expect(real.revertida).toBe(false);
    expect(await e.admin.etiquetaAsignacion.count({ where: { cuentaId: c.id } })).toBe(1);
  });

  it("las corridas y sus filas están aisladas por empresa", async () => {
    expect(await e.forTenant(otro).importacion.findMany({})).toHaveLength(0);
    expect((await e.forTenant(tenantId).importacion.findMany({})).length).toBeGreaterThan(0);
  });
});
