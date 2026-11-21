// Central PR 5 (CAR-471) con Postgres real: mensajes desde el portal del trabajador (R16) y avisos con
// acuse inmutable (R17, CA7), incluidas las alertas por urgencia, consulta vencida y falta de acuse.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/central/manifest";
import { trabajosCentral } from "../../../modules/central/trabajos";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Central · mensajes y avisos (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let t = "";
  let inst = "";
  let persona = "";
  const jefa = randomUUID();
  const guardia = randomUUID();
  const ajeno = randomUUID();

  const ctx = (uid: string | null, portal: "erp" | "trabajador" = "erp") =>
    mod.crearContexto({
      tenantId: t,
      actor: uid ? { tipo: "user", id: uid } : { tipo: "system" },
      ...(uid ? { usuario: { id: uid, nombre: "P", email: `${uid.slice(0, 6)}@men.test`, platformRole: null } } : {}),
      portal: uid ? portal : null,
      portalesMembresia: [portal],
      rol: portal === "erp" ? "admin" : "viewer",
      modulosActivos: ["central"],
      medidor: { registrar: async () => undefined },
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown) => mod.executeCapability(c, id, input);
  const ok = async <T>(c: ReturnType<typeof ctx>, id: string, input: unknown): Promise<T> => {
    const r = await run(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };
  const trabajo = (tipo: string) => trabajosCentral.find((x) => x.tipo === tipo)!;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    t = (await e.admin.tenant.create({ data: { slug: `men-${randomUUID().slice(0, 8)}`, nombre: "Men", vertical: "seguridad" } })).id;
    const c = await e.admin.cuenta.create({ data: { tenantId: t, nombre: "Cliente" } });
    inst = (await e.admin.instalacion.create({ data: { tenantId: t, cuentaId: c.id, nombre: "Bodega" } })).id;
    for (const [id, rol, portal] of [[jefa, "admin", "erp"], [guardia, "viewer", "trabajador"], [ajeno, "viewer", "trabajador"]] as const) {
      await e.admin.user.create({ data: { id, name: "P", email: `${id.slice(0, 8)}@men.test` } });
      await e.admin.membership.create({ data: { tenantId: t, userId: id, rol, portales: [portal] } });
    }
    const cargo = (await e.admin.cargo.create({ data: { tenantId: t, nombre: "Guardia" } })).id;
    persona = (await e.admin.persona.create({ data: { tenantId: t, usuarioId: guardia, nombres: "Gina", apellidos: "Guardia", rut: "11.111.111-1", estado: "activo" } })).id;
    await e.admin.persona.create({ data: { tenantId: t, usuarioId: ajeno, nombres: "Otro", apellidos: "Guardia", rut: "12.222.222-2", estado: "activo" } });
    await e.admin.vinculoLaboral.create({ data: { tenantId: t, personaId: persona, cargoId: cargo, instalacionId: inst, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: "5x2" } });
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  it("una urgencia abre una alerta crítica en la instalación del guardia", async () => {
    const r = await ok<{ id: string; alertaId: string }>(ctx(guardia, "trabajador"), "central.mensajes.enviar", { tipo: "urgencia" });
    const a = await e.admin.centralAlerta.findUniqueOrThrow({ where: { id: r.alertaId } });
    expect([a.severidad, a.instalacionId, a.personaId]).toEqual(["critica", inst, persona]);
  });

  it("la consulta sin respuesta entra a la cola; respondida, no", async () => {
    const g = ctx(guardia, "trabajador");
    const sin = await ok<{ id: string }>(g, "central.mensajes.enviar", { tipo: "consulta", texto: "¿Abro el portón?" });
    const con = await ok<{ id: string }>(g, "central.mensajes.enviar", { tipo: "consulta", texto: "¿Llamo al cliente?" });
    await ok(ctx(jefa), "central.mensajes.responder", { id: con.id, texto: "Sí, llámalo." });
    await e.admin.centralHilo.updateMany({ where: { id: { in: [sin.id, con.id] } }, data: { consultaVenceEn: new Date(Date.now() - 1000) } });
    for (const h of [sin.id, con.id]) await trabajo("central.mensajes.revisar_consulta").ejecutar(ctx(null), { hiloId: h });
    expect((await e.admin.centralHilo.findUniqueOrThrow({ where: { id: sin.id } })).alertaId).not.toBeNull();
    expect((await e.admin.centralHilo.findUniqueOrThrow({ where: { id: con.id } })).alertaId).toBeNull();
  });

  it("cada guardia ve solo sus hilos y un hilo cerrado no acepta mensajes", async () => {
    const h = await ok<{ id: string }>(ctx(guardia, "trabajador"), "central.mensajes.enviar", { tipo: "novedad", texto: "Luz cortada" });
    expect((await run(ctx(ajeno, "trabajador"), "central.mensajes.obtener", { id: h.id })).ok).toBe(false);
    await ok(ctx(jefa), "central.mensajes.cerrar", { id: h.id });
    expect((await run(ctx(guardia, "trabajador"), "central.mensajes.responder", { id: h.id, texto: "Más info" })).ok).toBe(false);
  });

  it("un aviso llega a quien trabaja en la instalación; el acuse es único y la falta de acuse abre alerta", async () => {
    const a = await ok<{ id: string; destinatarios: number }>(ctx(jefa), "central.avisos.crear", { tipo: "consigna", texto: "Revisar extintores", instalaciones: [inst] });
    expect(a.destinatarios).toBe(1);
    const pend = await ok<{ items: { pendienteDeAcuse: boolean }[] }>(ctx(guardia, "trabajador"), "central.avisos.listar", {});
    expect(pend.items[0]?.pendienteDeAcuse).toBe(true);
    expect((await ok<{ items: unknown[] }>(ctx(ajeno, "trabajador"), "central.avisos.listar", {})).items).toHaveLength(0);
    const sinAcuse = await ok<{ id: string }>(ctx(jefa), "central.avisos.crear", { tipo: "instruccion", texto: "Cerrar a las 22", instalaciones: [inst], acuseObligatorio: true });
    await ok(ctx(guardia, "trabajador"), "central.avisos.acusar", { id: a.id });
    expect((await run(ctx(guardia, "trabajador"), "central.avisos.acusar", { id: a.id })).ok).toBe(false);
    await e.admin.centralAvisoDestinatario.updateMany({ where: { tenantId: t }, data: { venceEn: new Date(Date.now() - 1000) } });
    for (const id of [a.id, sinAcuse.id]) await trabajo("central.avisos.revisar_acuse").ejecutar(ctx(null), { avisoId: id });
    const dest = await e.admin.centralAvisoDestinatario.findMany({ where: { tenantId: t }, orderBy: { createdAt: "asc" } });
    expect(dest.map((d) => d.alertaId != null)).toEqual([false, true]);
  });

  it("el acuse es inmutable para la app", async () => {
    await expect(e.admin.centralAcuse.updateMany({ where: { tenantId: t }, data: { tarde: true } })).rejects.toThrow();
  });
});
