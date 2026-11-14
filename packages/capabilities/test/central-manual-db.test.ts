// Escenario del manual docs/2.0/agentes/central.md (ADR-034) con Postgres real: el agente verifica
// que haya una persona a cargo, abre, escala y propone; la persona acepta y la alerta se resuelve a su
// nombre (CA3). También: una propuesta rechazada no cambia nada y el agente no cierra por su cuenta.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/central/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Central · escenario del manual del agente (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let t = "";
  let inst = "";
  const op = randomUUID();

  const ctx = (agente: boolean) =>
    mod.crearContexto({
      tenantId: t,
      actor: agente ? { tipo: "agent", id: randomUUID(), viaUserId: op } : { tipo: "user", id: op },
      usuario: { id: op, nombre: "Operadora", email: `${op.slice(0, 6)}@man.test`, platformRole: null },
      portal: agente ? null : "erp",
      portalesMembresia: ["erp"],
      rol: "admin",
      modulosActivos: ["central"],
      medidor: { registrar: async () => undefined },
      ...(agente
        ? { principal: { tipo: "servicio" as const, id: randomUUID() }, scopes: ["core", "central"], agente: { apiKeyId: randomUUID(), nombre: "Agente de central", presupuestoMensualMicro: null, autonomia: {} } }
        : {}),
    });
  const run = (agente: boolean, id: string, input: unknown) => mod.executeCapability(ctx(agente), id, input);
  const ok = async <T>(agente: boolean, id: string, input: unknown): Promise<T> => {
    const r = await run(agente, id, input);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    t = (await e.admin.tenant.create({ data: { slug: `man-${randomUUID().slice(0, 8)}`, nombre: "Man", vertical: "seguridad" } })).id;
    const c = await e.admin.cuenta.create({ data: { tenantId: t, nombre: "Cliente" } });
    inst = (await e.admin.instalacion.create({ data: { tenantId: t, cuentaId: c.id, nombre: "Bodega" } })).id;
    await e.admin.user.create({ data: { id: op, name: "Operadora", email: `${op.slice(0, 8)}@man.test` } });
    await e.admin.membership.create({ data: { tenantId: t, userId: op, rol: "admin", portales: ["erp"] } });
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  it("sigue el manual: persona a cargo → abrir → escalar → proponer → la persona acepta", async () => {
    expect(await ok<{ responsable: unknown }>(true, "central.turno.estado", {})).toMatchObject({ responsable: null });
    await ok(false, "central.turno.abrir", {});
    const { id } = await ok<{ id: string }>(true, "central.alertas.abrir", { instalacionId: inst, titulo: "Portón abierto de noche", severidad: "media" });
    await ok(true, "central.alertas.escalar", { id });
    expect(await run(true, "central.alertas.resolver", { id, nota: "Lo cierro yo" })).toMatchObject({ ok: false });
    const p = await ok<{ id: string }>(true, "central.alertas.proponer", { id, accion: "resolver", nota: "El supervisor confirmó que cerró el portón" });
    const pendientes = await ok<{ items: { id: string }[] }>(false, "central.propuestas.listar", {});
    expect(pendientes.items.map((x) => x.id)).toContain(p.id);
    expect(await run(true, "central.propuestas.resolver", { id: p.id, aceptar: true })).toMatchObject({ ok: false });
    await ok(false, "central.propuestas.resolver", { id: p.id, aceptar: true });
    const r = await ok<{ alerta: { estado: string }; eventos: { tipo: string; actorTipo: string }[] }>(false, "central.alertas.obtener", { id });
    expect(r.alerta.estado).toBe("resuelta");
    expect(r.eventos.find((x) => x.tipo === "resuelta")?.actorTipo).toBe("persona");
    expect(r.eventos.map((x) => x.tipo)).toContain("propuesta_aceptada");
  });

  it("una propuesta rechazada no cambia la alerta; no se duplica una pendiente igual", async () => {
    const { id } = await ok<{ id: string }>(true, "central.alertas.abrir", { instalacionId: inst, titulo: "Cámara caída", severidad: "alta" });
    const p = await ok<{ id: string }>(true, "central.alertas.proponer", { id, accion: "bajar_severidad", severidad: "baja", nota: "Es solo una cámara de respaldo" });
    expect(await run(true, "central.alertas.proponer", { id, accion: "bajar_severidad", severidad: "media", nota: "Otra vez lo mismo" })).toMatchObject({ ok: false });
    await ok(false, "central.propuestas.resolver", { id: p.id, aceptar: false, motivo: "La cámara cubre el acceso principal" });
    expect((await e.admin.centralAlerta.findUniqueOrThrow({ where: { id } })).severidad).toBe("alta");
  });

  it("no se propone bajar la severidad de un botón de emergencia ni resolver una alerta cerrada", async () => {
    const a = await e.admin.centralAlerta.create({ data: { tenantId: t, instalacionId: inst, titulo: "Emergencia", severidad: "critica", origen: "rondas.emergencia" } });
    expect(await run(true, "central.alertas.proponer", { id: a.id, accion: "bajar_severidad", severidad: "baja", nota: "Parece un error del guardia" })).toMatchObject({ ok: false });
    const { id } = await ok<{ id: string }>(false, "central.alertas.abrir", { instalacionId: inst, titulo: "Ruido", severidad: "baja" });
    await ok(false, "central.alertas.resolver", { id, nota: "Era el viento" });
    expect(await run(true, "central.alertas.proponer", { id, accion: "resolver", nota: "Ya está bien" })).toMatchObject({ ok: false });
  });
});
