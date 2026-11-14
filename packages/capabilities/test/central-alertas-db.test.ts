// Central PR 1 (CAR-461) con Postgres real: abrir, cerrar, reabrir y posponer alertas; alcance del
// supervisor, aislamiento entre empresas, línea de tiempo inmutable y bitácora encadenada.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/central/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Rol = "admin" | "supervisor";
type Alerta = { id: string; estado: string; instalacionId: string; notaCierre: string | null };

describe.skipIf(omitirSuiteDb())("Central · alertas (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A1: "", A2: "", B: "" };
  const admin = randomUUID();
  const sup = randomUUID();
  const adminB = randomUUID();

  const ctx = (uid: string, rol: Rol, tid: string, alcance: string[] | null, servicio = false) =>
    mod.crearContexto({
      tenantId: tid,
      actor: servicio ? { tipo: "agent", id: randomUUID(), viaUserId: uid } : { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@central.test`, platformRole: null },
      portal: servicio ? null : "erp",
      portalesMembresia: ["erp"],
      rol,
      alcance: alcance ? { instalaciones: alcance } : null,
      modulosActivos: ["central"],
      medidor: { registrar: async () => undefined },
      ...(servicio
        ? {
            principal: { tipo: "servicio" as const, id: randomUUID() },
            scopes: ["*"],
            agente: { apiKeyId: randomUUID(), nombre: "Agente de central", presupuestoMensualMicro: null, autonomia: {} },
          }
        : {}),
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, dryRun = false) =>
    mod.executeCapability(c, id, input, { dryRun });
  const ok = async <T>(c: ReturnType<typeof ctx>, id: string, input: unknown): Promise<T> => {
    const r = await run(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };
  const adminA = () => ctx(admin, "admin", t.A, null);
  const supA = () => ctx(sup, "supervisor", t.A, [inst.A1]);
  const abrir = (c: ReturnType<typeof ctx>, instalacionId: string, severidad = "alta") =>
    ok<{ id: string }>(c, "central.alertas.abrir", { instalacionId, titulo: "Guardia no responde", severidad });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const)
      t[k] = (await e.admin.tenant.create({ data: { slug: `ce-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" } })).id;
    const cA = await e.admin.cuenta.create({ data: { tenantId: t.A, nombre: "Cliente A" } });
    const cB = await e.admin.cuenta.create({ data: { tenantId: t.B, nombre: "Cliente B" } });
    inst.A1 = (await e.admin.instalacion.create({ data: { tenantId: t.A, cuentaId: cA.id, nombre: "Bodega" } })).id;
    inst.A2 = (await e.admin.instalacion.create({ data: { tenantId: t.A, cuentaId: cA.id, nombre: "Oficina" } })).id;
    inst.B = (await e.admin.instalacion.create({ data: { tenantId: t.B, cuentaId: cB.id, nombre: "Planta" } })).id;
    for (const [id, rol, tid] of [[admin, "admin", t.A], [sup, "supervisor", t.A], [adminB, "admin", t.B]] as const) {
      await e.admin.user.create({ data: { id, name: rol, email: `${id.slice(0, 8)}@central.test` } });
      await e.admin.membership.create({ data: { tenantId: tid, userId: id, rol, portales: ["erp"] } });
    }
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  it("abre una alerta nueva, con su hecho en la línea de tiempo y en la bitácora encadenada", async () => {
    const { id } = await abrir(adminA(), inst.A1);
    const r = await ok<{ alerta: Alerta; eventos: { tipo: string; actorTipo: string }[] }>(adminA(), "central.alertas.obtener", { id });
    expect(r.alerta.estado).toBe("nueva");
    expect(r.eventos).toMatchObject([{ tipo: "abierta", actorTipo: "persona" }]);
    const hechos = await e.admin.bitacora.findMany({ where: { tenantId: t.A, entidadId: id } });
    expect(hechos.map((h) => h.tipo)).toEqual(["central.alerta.abierta"]);
  });

  it("la vista previa no escribe nada", async () => {
    const antes = await e.admin.centralAlerta.count({ where: { tenantId: t.A } });
    const r = await run(adminA(), "central.alertas.abrir", { instalacionId: inst.A1, titulo: "Prueba", severidad: "baja" }, true);
    expect(r.ok).toBe(true);
    expect(await e.admin.centralAlerta.count({ where: { tenantId: t.A } })).toBe(antes);
  });

  it("resuelve, rechaza resolver dos veces y reabre en atención", async () => {
    const { id } = await abrir(adminA(), inst.A1);
    await ok(adminA(), "central.alertas.resolver", { id, nota: "Supervisor llegó al puesto" });
    const otra = await run(adminA(), "central.alertas.resolver", { id, nota: "Otra vez" });
    expect(otra).toMatchObject({ ok: false });
    const re = await ok<{ estado: string }>(adminA(), "central.alertas.reabrir", { id, nota: "El guardia volvió a faltar" });
    expect(re.estado).toBe("en_atencion");
  });

  it("pospone y la alerta sale de la cola activa hasta que vence el plazo", async () => {
    const { id } = await abrir(adminA(), inst.A2, "media");
    await ok(adminA(), "central.alertas.posponer", { id, minutos: 30 });
    const activas = await ok<{ items: Alerta[] }>(adminA(), "central.alertas.listar", { vista: "activas" });
    expect(activas.items.some((a) => a.id === id)).toBe(false);
    await e.admin.centralAlerta.update({ where: { id }, data: { pospuestaHasta: new Date(Date.now() - 60_000) } });
    const otra = await ok<{ items: Alerta[] }>(adminA(), "central.alertas.listar", { vista: "activas" });
    expect(otra.items.find((a) => a.id === id)?.estado).toBe("nueva");
    await ok(adminA(), "central.alertas.falsa_alarma", { id, nota: "Era un simulacro" });
    const ev = await ok<{ eventos: { tipo: string }[] }>(adminA(), "central.alertas.obtener", { id });
    expect(ev.eventos.map((x) => x.tipo)).toEqual(["abierta", "pospuesta", "reactivada", "falsa_alarma"]);
  });

  it("el supervisor solo ve y atiende las alertas de sus instalaciones", async () => {
    const ajena = await abrir(adminA(), inst.A2);
    const lista = await ok<{ items: Alerta[] }>(supA(), "central.alertas.listar", { vista: "todas" });
    expect(lista.items.every((a) => a.instalacionId === inst.A1)).toBe(true);
    expect(await run(supA(), "central.alertas.obtener", { id: ajena.id })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await run(supA(), "central.alertas.abrir", { instalacionId: inst.A2, titulo: "Fuera", severidad: "baja" })).toMatchObject({ ok: false });
    const propia = await abrir(supA(), inst.A1);
    expect(propia.id).toBeTruthy();
  });

  it("otra empresa no ve ni toca las alertas, ni abre en instalaciones ajenas", async () => {
    const { id } = await abrir(adminA(), inst.A1);
    const bCtx = () => ctx(adminB, "admin", t.B, null);
    expect(await run(bCtx(), "central.alertas.obtener", { id })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await run(bCtx(), "central.alertas.resolver", { id, nota: "No es mía" })).toMatchObject({ ok: false });
    expect(await run(bCtx(), "central.alertas.abrir", { instalacionId: inst.A1, titulo: "Ajena", severidad: "baja" })).toMatchObject({ ok: false });
    const estado = await ok<{ activas: Record<string, number> }>(bCtx(), "central.estado", {});
    expect(Object.values(estado.activas).every((n) => n === 0)).toBe(true);
  });

  it("el agente de central abre alertas pero no las cierra por su cuenta (R10)", async () => {
    const agente = () => ctx(admin, "admin", t.A, null, true);
    const { id } = await abrir(agente(), inst.A1);
    const r = await run(agente(), "central.alertas.resolver", { id, nota: "Lo cierro yo" });
    expect(r).toMatchObject({ ok: false });
    const ev = await ok<{ eventos: { actorTipo: string }[] }>(adminA(), "central.alertas.obtener", { id });
    expect(ev.eventos[0]?.actorTipo).toBe("agente");
  });

  it("la línea de tiempo no se puede editar ni borrar", async () => {
    const { id } = await abrir(adminA(), inst.A1);
    await expect(e.admin.centralAlertaEvento.deleteMany({ where: { alertaId: id } })).rejects.toThrow(/append-only/);
  });
});
