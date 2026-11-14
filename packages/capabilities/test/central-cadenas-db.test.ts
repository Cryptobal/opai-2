// Central PR 2 (CAR-468) con Postgres real: la cadena contacta el paso 1 al abrir, escala al vencer,
// «me hago cargo» la detiene, el contacto manual queda en la bitácora y la cadena propia gana.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/central/manifest";
import { consumidoresCentral, trabajosCentral } from "../../../modules/central/trabajos";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Central · cadenas de escalamiento (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let t = "";
  let inst = "";
  let persona = "";
  const admin = randomUUID();
  const sup = randomUUID();
  const guardia = randomUUID();
  const gerente = randomUUID();

  const ctx = (uid: string | null, rol: "admin" | "supervisor" = "admin") =>
    mod.crearContexto({
      tenantId: t,
      actor: uid ? { tipo: "user", id: uid } : { tipo: "system" },
      ...(uid ? { usuario: { id: uid, nombre: "P", email: `${uid.slice(0, 6)}@cad.test`, platformRole: null } } : {}),
      portal: uid ? "erp" : null,
      portalesMembresia: ["erp"],
      rol: uid ? rol : "owner",
      alcance: rol === "supervisor" ? { instalaciones: [inst] } : null,
      modulosActivos: ["central"],
      medidor: { registrar: async () => undefined },
    });
  const ok = async <T>(c: ReturnType<typeof ctx>, id: string, input: unknown): Promise<T> => {
    const r = await mod.executeCapability(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };
  const consumidor = consumidoresCentral[0]!;
  const revisar = trabajosCentral[0]!;
  /** Abre una alerta y corre el consumidor como lo haría el despacho del outbox. */
  const abrirYContactar = async (severidad = "alta") => {
    const { id } = await ok<{ id: string }>(ctx(admin), "central.alertas.abrir", { instalacionId: inst, personaId: persona, titulo: "No marcó", severidad });
    const ev = await e.admin.evento.findFirstOrThrow({ where: { tenantId: t, tipo: "central.alerta.abierta", entidadId: id } });
    await consumidor.handler(ctx(null), { ...ev, actorTipo: ev.actorTipo, payload: ev.payload });
    return id;
  };
  const vencer = (id: string) =>
    e.admin.centralAlerta.update({ where: { id }, data: { pasoVenceEn: new Date(Date.now() - 1000), atencionVenceEn: null } });
  const notificaciones = (usuarioId: string) => e.admin.notificacion.count({ where: { tenantId: t, usuarioId } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    t = (await e.admin.tenant.create({ data: { slug: `cad-${randomUUID().slice(0, 8)}`, nombre: "Cad", vertical: "seguridad" } })).id;
    const c = await e.admin.cuenta.create({ data: { tenantId: t, nombre: "Cliente" } });
    inst = (await e.admin.instalacion.create({ data: { tenantId: t, cuentaId: c.id, nombre: "Bodega" } })).id;
    for (const [id, rol] of [[admin, "admin"], [sup, "supervisor"], [guardia, "viewer"], [gerente, "gerente"]] as const) {
      await e.admin.user.create({ data: { id, name: rol, email: `${id.slice(0, 8)}@cad.test` } });
      const m = await e.admin.membership.create({ data: { tenantId: t, userId: id, rol, portales: ["erp"] } });
      if (rol === "supervisor") await e.admin.supervisorInstalacion.create({ data: { tenantId: t, membershipId: m.id, instalacionId: inst } });
    }
    persona = (await e.admin.persona.create({ data: { tenantId: t, nombres: "Gabo", apellidos: "Guardia", rut: "12.345.678-5", usuarioId: guardia } })).id;
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  it("al abrir, contacta al guardia (paso 1) por la campana y deja el resto de canales apagados", async () => {
    const antes = await notificaciones(guardia);
    const id = await abrirYContactar();
    const r = await ok<{ alerta: { estado: string; pasoActual: number }; intentos: { canal: string; resultado: string }[] }>(ctx(admin), "central.alertas.obtener", { id });
    expect(r.alerta).toMatchObject({ estado: "en_contacto", pasoActual: 1 });
    expect(r.intentos).toEqual(expect.arrayContaining([expect.objectContaining({ canal: "campana", resultado: "avisado" }), expect.objectContaining({ canal: "push", resultado: "apagado" })]));
    expect(await notificaciones(guardia)).toBe(antes + 1);
    expect(await e.admin.trabajo.count({ where: { tenantId: t, tipo: "central.alertas.revisar" } })).toBeGreaterThan(0);
  });

  it("al vencer la espera escala al supervisor; «me hago cargo» la detiene y su vencimiento la retoma", async () => {
    const id = await abrirYContactar();
    await vencer(id);
    await revisar.ejecutar(ctx(null), { alertaId: id });
    let a = await e.admin.centralAlerta.findUniqueOrThrow({ where: { id } });
    expect(a).toMatchObject({ estado: "escalada", pasoActual: 2 });
    expect(await notificaciones(sup)).toBeGreaterThan(0);
    await ok(ctx(sup, "supervisor"), "central.alertas.hacerse_cargo", { id });
    a = await e.admin.centralAlerta.findUniqueOrThrow({ where: { id } });
    expect(a).toMatchObject({ estado: "en_atencion", atencionPorId: sup });
    await revisar.ejecutar(ctx(null), { alertaId: id });
    expect((await e.admin.centralAlerta.findUniqueOrThrow({ where: { id } })).estado).toBe("en_atencion");
    await e.admin.centralAlerta.update({ where: { id }, data: { atencionVenceEn: new Date(Date.now() - 1000) } });
    await revisar.ejecutar(ctx(null), { alertaId: id });
    expect(await e.admin.centralAlerta.findUniqueOrThrow({ where: { id } })).toMatchObject({ estado: "escalada", pasoActual: 3 });
  });

  it("una crítica contacta los pasos 2 y 3 a la vez", async () => {
    const id = await abrirYContactar("critica");
    await ok(ctx(admin), "central.alertas.escalar", { id });
    expect(await e.admin.centralAlerta.findUniqueOrThrow({ where: { id } })).toMatchObject({ pasoActual: 3 });
    expect(await e.admin.centralIntento.count({ where: { alertaId: id, destinatarioId: gerente } })).toBeGreaterThan(0);
  });

  it("el contacto manual queda en la bitácora y no se puede borrar", async () => {
    const id = await abrirYContactar();
    await ok(ctx(admin), "central.alertas.contactar", { id, canal: "llamada", destinatarioId: sup, resultado: "no_contesto" });
    expect(await e.admin.centralIntento.count({ where: { alertaId: id, canal: "llamada", resultado: "no_contesto" } })).toBe(1);
    await expect(e.admin.centralIntento.deleteMany({ where: { alertaId: id } })).rejects.toThrow(/append-only/);
  });

  it("una cadena propia de la instalación reemplaza a la plantilla", async () => {
    await ok(ctx(admin), "central.cadenas.guardar", {
      instalacionId: inst,
      pasos: [{ destinatario: { tipo: "usuario", usuarioId: gerente }, canales: ["campana"], esperaMin: 2, exigeConfirmacion: true }],
    });
    const id = await abrirYContactar("baja");
    const intentos = await e.admin.centralIntento.findMany({ where: { alertaId: id } });
    expect(intentos.map((x) => x.destinatarioId)).toEqual([gerente]);
    const r = await mod.executeCapability(ctx(admin), "central.alertas.escalar", { id });
    expect(r).toMatchObject({ ok: false });
  });

  it("una pospuesta vuelve sola a la cola cuando corre su trabajo", async () => {
    const id = await abrirYContactar();
    await ok(ctx(admin), "central.alertas.posponer", { id, minutos: 10 });
    await e.admin.centralAlerta.update({ where: { id }, data: { pospuestaHasta: new Date(Date.now() - 1000) } });
    await revisar.ejecutar(ctx(null), { alertaId: id });
    expect((await e.admin.centralAlerta.findUniqueOrThrow({ where: { id } })).estado).not.toBe("pospuesta");
  });
});
