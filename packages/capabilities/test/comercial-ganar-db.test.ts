// CAR-162 · Ganar con efectos (R18, R45) contra Postgres real con un rol sin BYPASSRLS: ganar emite
// `comercial.negocio.ganado`, el despacho del outbox corre los consumidores y deja la cuenta activa,
// las instalaciones activas, la vigente aceptada y las demás abiertas rechazadas. Repetir no duplica
// y la otra empresa no se toca.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { consumidorCpqGanado } from "../src/comercial/consumidor-ganado-cpq";
import { registrarModuloComercial } from "./comercial-modulo";

describe("comercial · ganar con efectos en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      modulosActivos: ["comercial", "cpq"],
      medidor,
    });

  async function dato<T>(tenantId: string, id: string, input: unknown, dryRun = false) {
    const r = await mod.executeCapability(ctx(tenantId), id, input, { dryRun });
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  async function escenario(nombre: string) {
    const t = await e.admin.tenant.create({
      data: { slug: `ganar-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" },
    });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const cuentaId = (await dato<{ id: string }>(t.id, "core.cuentas.create", { nombre })).id;
    const inst = async (n: string) =>
      (await dato<{ id: string }>(t.id, "core.instalaciones.create", { cuentaId, nombre: n })).id;
    const planta = await inst("Planta Norte");
    const bodega = await inst("Bodega Sur");
    const negocio = await dato<{ id: string }>(t.id, "comercial.negocios.create", {
      cuentaId,
      titulo: `Guardias ${nombre}`,
    });
    for (const instalacionId of [planta, bodega])
      await dato(t.id, "comercial.negocios.vincular_instalacion", {
        negocioId: negocio.id,
        instalacionId,
        tipo: "nueva",
      });
    await dato(t.id, "comercial.negocios.update", {
      id: negocio.id,
      inicioServicioEstimado: "2026-12-01",
    });
    const usuario = (
      await e.admin.user.create({
        data: { email: `ganar-${randomUUID().slice(0, 8)}@prueba.cl`, name: "Ana", emailVerified: true },
      })
    ).id;
    const cot = (codigo: string, vigente: boolean) =>
      e.admin.cpqCotizacion.create({
        data: { tenantId: t.id, negocioId: negocio.id, codigo, titulo: codigo, vigente, creadoPorId: usuario },
      });
    const vigente = await cot(`CPQ-${t.id.slice(0, 6)}-1`, true);
    const otra = await cot(`CPQ-${t.id.slice(0, 6)}-2`, false);
    const version = (cotizacionId: string, numero: number, estado: string) =>
      e.admin.cpqVersion.create({
        data: { tenantId: t.id, cotizacionId, numero, estado, creadoPorId: usuario },
      });
    const v1 = await version(vigente.id, 1, "reemplazada");
    const v2 = await version(vigente.id, 2, "enviada");
    const vo = await version(otra.id, 1, "lista");
    const seccion = await e.admin.cpqSeccion.create({
      data: { tenantId: t.id, versionId: v2.id, nombre: "Planta Norte" },
    });
    await e.admin.cpqLinea.create({
      data: { tenantId: t.id, seccionId: seccion.id, tipo: "puesto", nombre: "Guardia día", posiciones: 2 },
    });
    await e.admin.cpqLinea.create({
      data: { tenantId: t.id, seccionId: seccion.id, tipo: "item", nombre: "Radio", posiciones: 3 },
    });
    return { tenantId: t.id, cuentaId, planta, bodega, negocioId: negocio.id, v1, v2, vo };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
    registrarModuloComercial();
    mod.limpiarConsumidores();
    mod.registrarConsumidores(mod.consumidoresDelNucleo);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("la vista previa anuncia los efectos y ganar los aplica al despachar el outbox", async () => {
    const a = await escenario("Alfa");
    const b = await escenario("Beta");
    const previa = await dato<{ efectos: Record<string, unknown> }>(
      a.tenantId,
      "comercial.negocios.ganar",
      { id: a.negocioId },
      true,
    );
    expect(previa.efectos).toMatchObject({
      cuenta: { id: a.cuentaId, hacia: "cliente_activo" },
      cotizacion: { versionId: a.v2.id, version: 2 },
      rechazadas: 1,
      puestosPorOfrecer: 2,
    });
    expect((previa.efectos["instalaciones"] as unknown[]).length).toBe(2);
    await dato(a.tenantId, "comercial.negocios.ganar", { id: a.negocioId });
    await mod.despacharPendientes(ctx(a.tenantId));

    const cuenta = await e.admin.cuenta.findUniqueOrThrow({ where: { id: a.cuentaId } });
    expect(cuenta.estado).toBe("cliente_activo");
    expect(cuenta.clienteDesde).not.toBeNull();
    const inst = await e.admin.instalacion.findMany({ where: { id: { in: [a.planta, a.bodega] } } });
    expect(inst.map((i) => i.estado)).toEqual(["activa", "activa"]);
    const estado = async (id: string) =>
      (await e.admin.cpqVersion.findUniqueOrThrow({ where: { id } })).estado;
    expect(await estado(a.v2.id)).toBe("aceptada");
    expect(await estado(a.vo.id)).toBe("rechazada");
    expect(await estado(a.v1.id)).toBe("reemplazada");
    const aceptada = await e.admin.evento.findMany({
      where: { tenantId: a.tenantId, tipo: "cpq.cotizacion.aceptada" },
    });
    expect(aceptada).toHaveLength(1);
    expect(aceptada[0]?.payload).toMatchObject({ puestosPorOfrecer: 2 });

    // Repetir el despacho (reintento) no duplica eventos ni cambia nada.
    const antes = await e.admin.evento.count({ where: { tenantId: a.tenantId } });
    await mod.despacharPendientes(ctx(a.tenantId));
    await consumidorCpqGanado.handler(ctx(a.tenantId), {
      id: randomUUID(),
      tipo: "comercial.negocio.ganado",
      entidadTipo: "negocio",
      entidadId: a.negocioId,
      payload: {},
      actorTipo: "system",
      actorId: null,
      viaUserId: null,
      createdAt: new Date(),
    });
    expect(await e.admin.evento.count({ where: { tenantId: a.tenantId } })).toBe(antes);

    // La otra empresa sigue intacta.
    const otra = await e.admin.cuenta.findUniqueOrThrow({ where: { id: b.cuentaId } });
    expect(otra.estado).toBe("prospecto");
    expect(await estado(b.v2.id)).toBe("enviada");
    // Y su negocio no es visible desde el contexto de A (RLS): el consumidor no lo encuentra.
    await mod.despacharPendientes(ctx(a.tenantId));
    expect(
      (await e.admin.instalacion.findUniqueOrThrow({ where: { id: b.planta } })).estado,
    ).toBe("prospecto");
  });
});
