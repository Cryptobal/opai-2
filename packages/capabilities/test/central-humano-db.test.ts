// Central PR 4 (CAR-470) con Postgres real: sin nadie a cargo el agente solo mira; turno, entrega y
// aceptación; tomar detiene al agente y a la cadena; pausar y reanudar al agente.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/central/manifest";
import { trabajosCentral } from "../../../modules/central/trabajos";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Central · humano a cargo (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let t = "";
  let inst = "";
  const ana = randomUUID();
  const beto = randomUUID();

  const ctx = (uid: string, agente = false) =>
    mod.crearContexto({
      tenantId: t,
      actor: agente ? { tipo: "agent", id: randomUUID(), viaUserId: uid } : { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "P", email: `${uid.slice(0, 6)}@hum.test`, platformRole: null },
      portal: agente ? null : "erp",
      portalesMembresia: ["erp"],
      rol: "admin",
      modulosActivos: ["central"],
      medidor: { registrar: async () => undefined },
      ...(agente
        ? { principal: { tipo: "servicio" as const, id: randomUUID() }, scopes: ["*"], agente: { apiKeyId: randomUUID(), nombre: "Agente de central", presupuestoMensualMicro: null, autonomia: {} } }
        : {}),
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown) => mod.executeCapability(c, id, input);
  const ok = async <T>(c: ReturnType<typeof ctx>, id: string, input: unknown): Promise<T> => {
    const r = await run(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };
  const abrir = (c: ReturnType<typeof ctx>) => run(c, "central.alertas.abrir", { instalacionId: inst, titulo: "Guardia no responde", severidad: "alta" });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    t = (await e.admin.tenant.create({ data: { slug: `hum-${randomUUID().slice(0, 8)}`, nombre: "Hum", vertical: "seguridad" } })).id;
    const c = await e.admin.cuenta.create({ data: { tenantId: t, nombre: "Cliente" } });
    inst = (await e.admin.instalacion.create({ data: { tenantId: t, cuentaId: c.id, nombre: "Bodega" } })).id;
    for (const id of [ana, beto]) {
      await e.admin.user.create({ data: { id, name: "P", email: `${id.slice(0, 8)}@hum.test` } });
      await e.admin.membership.create({ data: { tenantId: t, userId: id, rol: "admin", portales: ["erp"] } });
    }
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  it("sin nadie a cargo el agente no abre alertas; con turno abierto sí", async () => {
    expect(await abrir(ctx(ana, true))).toMatchObject({ ok: false });
    expect(await ok<{ responsable: unknown }>(ctx(ana), "central.turno.estado", {})).toMatchObject({ responsable: null });
    await ok(ctx(ana), "central.turno.abrir", {});
    expect(await abrir(ctx(ana, true))).toMatchObject({ ok: true });
    expect(await run(ctx(beto), "central.turno.abrir", {})).toMatchObject({ ok: false });
  });

  it("el agente no puede abrir ni tomar turnos (solo personas)", async () => {
    expect(await run(ctx(beto, true), "central.turno.aceptar", {})).toMatchObject({ ok: false });
    expect(await run(ctx(beto, true), "central.agente.reanudar", {})).toMatchObject({ ok: false });
  });

  it("tomar detiene al agente y a la cadena; devolver los reanuda", async () => {
    const { id } = await ok<{ id: string }>(ctx(ana), "central.alertas.abrir", { instalacionId: inst, titulo: "Puerta abierta", severidad: "media" });
    await ok(ctx(ana), "central.alertas.tomar", { id });
    expect(await run(ctx(ana, true), "central.alertas.escalar", { id })).toMatchObject({ ok: false });
    await e.admin.centralAlerta.update({ where: { id }, data: { atencionVenceEn: new Date(Date.now() - 1000) } });
    await trabajosCentral[0]!.ejecutar(ctx(ana), { alertaId: id });
    expect(await e.admin.centralAlerta.findUniqueOrThrow({ where: { id } })).toMatchObject({ estado: "en_atencion", tomadaPorId: ana });
    await ok(ctx(ana), "central.alertas.devolver", { id });
    expect((await e.admin.centralAlerta.findUniqueOrThrow({ where: { id } })).tomadaPorId).toBeNull();
  });

  it("la entrega pasa las alertas tomadas al nuevo operador", async () => {
    const { id } = await ok<{ id: string }>(ctx(ana), "central.alertas.abrir", { instalacionId: inst, titulo: "Cerco cortado", severidad: "alta" });
    await ok(ctx(ana), "central.alertas.tomar", { id });
    await ok(ctx(ana), "central.turno.entregar", { aUsuarioId: beto, nota: "Queda una alerta tomada" });
    await ok(ctx(beto), "central.turno.aceptar", {});
    expect((await e.admin.centralAlerta.findUniqueOrThrow({ where: { id } })).tomadaPorId).toBe(beto);
    expect(await ok<{ responsable: { usuarioId: string } }>(ctx(ana), "central.turno.estado", {})).toMatchObject({ responsable: { usuarioId: beto } });
  });

  it("pausado, el agente no actúa en la instalación; reanudar es de personas", async () => {
    await ok(ctx(beto, true), "central.agente.pausar", { instalacionId: inst });
    expect(await abrir(ctx(beto, true))).toMatchObject({ ok: false });
    await ok(ctx(beto), "central.agente.reanudar", { instalacionId: inst });
    expect(await abrir(ctx(beto, true))).toMatchObject({ ok: true });
  });
});
