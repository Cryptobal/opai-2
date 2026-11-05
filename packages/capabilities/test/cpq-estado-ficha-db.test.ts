// CAR-192 · Reglas de estado de CPQ y respuesta del cliente contra Postgres real con un rol sin
// BYPASSRLS y dos empresas: el objetivo de margen es de cada empresa, «Reabrir para editar» no cruza
// empresas ni choca con el índice único, «Nueva versión» no se ofrece en lista y la columna nueva
// `avisado_en` guarda el aviso sin pisar el motivo de la pausa.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { aplicarRespuesta } from "../src/comercial/seguimiento-ejecucion";
import { registrarModuloComercial } from "./comercial-modulo";

type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

describe.skipIf(!urlPropietario)("cpq · estado de la ficha y respuesta del cliente en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const usuario = randomUUID();
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["comercial", "cpq"],
      medidor,
    });
  const run = <T>(tenantId: string, id: string, input: unknown, dryRun = false) =>
    mod.executeCapability(ctx(tenantId), id, input, { dryRun }) as Promise<Res<T>>;
  async function ok<T>(tenantId: string, id: string, input: unknown) {
    const r = await run<T>(tenantId, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  }

  async function escenario(nombre: string, objetivoPct?: number) {
    const t = await e.admin.tenant.create({
      data: { slug: `est-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" },
    });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const sis = async <T>(id: string, input: unknown) => {
      const r = (await mod.executeCapability(
        mod.crearContexto({ tenantId: t.id, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor }),
        id,
        input,
      )) as Res<T>;
      if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
      return r.data;
    };
    const cuentaId = (await sis<{ id: string }>("core.cuentas.create", { nombre })).id;
    const negocio = await sis<{ id: string }>("comercial.negocios.create", { cuentaId, titulo: `Guardias ${nombre}` });
    if (objetivoPct !== undefined)
      await e.admin.ajuste.create({
        data: { tenantId: t.id, ambito: "tenant", sujetoId: t.id, modulo: "cpq", clave: "margen_objetivo_defecto_pct", valor: objetivoPct },
      });
    return { tenantId: t.id, negocioId: negocio.id };
  }

  let a: Awaited<ReturnType<typeof escenario>>;
  let b: Awaited<ReturnType<typeof escenario>>;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...capacidadesCpq]);
    registrarModuloComercial();
    await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@cpq.test`, name: "Ana", emailVerified: true } });
    a = await escenario("Alfa", 25);
    b = await escenario("Beta");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada empresa crea con su objetivo de margen, nunca con 0 %", async () => {
    const ca = await ok<{ versionId: string }>(a.tenantId, "cpq.cotizaciones.create", { negocioId: a.negocioId, titulo: "Alfa" });
    const cb = await ok<{ versionId: string }>(b.tenantId, "cpq.cotizaciones.create", { negocioId: b.negocioId, titulo: "Beta" });
    const va = await e.admin.cpqVersion.findUniqueOrThrow({ where: { id: ca.versionId } });
    const vb = await e.admin.cpqVersion.findUniqueOrThrow({ where: { id: cb.versionId } });
    expect(va.margenObjetivoPct).toBe(250_000);
    expect(vb.margenObjetivoPct).toBe(200_000);
  });

  it("reabrir: lista vuelve a borrador sin chocar con el índice único; otra empresa no puede", async () => {
    const c = await ok<{ id: string; versionId: string }>(a.tenantId, "cpq.cotizaciones.create", { negocioId: a.negocioId, titulo: "Para reabrir" });
    await e.admin.cpqVersion.update({ where: { id: c.versionId }, data: { estado: "lista" } });
    const ajena = await run(b.tenantId, "cpq.cotizaciones.reabrir", { id: c.id });
    expect(ajena).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect((await e.admin.cpqVersion.findUniqueOrThrow({ where: { id: c.versionId } })).estado).toBe("lista");
    await ok(a.tenantId, "cpq.cotizaciones.reabrir", { id: c.id });
    expect((await e.admin.cpqVersion.findUniqueOrThrow({ where: { id: c.versionId } })).estado).toBe("borrador");
    expect(await e.admin.cpqVersion.count({ where: { cotizacionId: c.id } })).toBe(1);
  });

  it("nueva versión: en lista pide reabrir (sin chocar con el índice); con la última enviada sí crea", async () => {
    const c = await ok<{ id: string; versionId: string }>(a.tenantId, "cpq.cotizaciones.create", { negocioId: a.negocioId, titulo: "Versiones" });
    await e.admin.cpqVersion.update({ where: { id: c.versionId }, data: { estado: "lista" } });
    const r = await run(a.tenantId, "cpq.versiones.crear", { cotizacionId: c.id });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    await e.admin.cpqVersion.update({ where: { id: c.versionId }, data: { estado: "enviada" } });
    const nueva = await ok<{ numero: number }>(a.tenantId, "cpq.versiones.crear", { cotizacionId: c.id });
    expect(nueva.numero).toBe(2);
    expect(await e.admin.cpqVersion.count({ where: { cotizacionId: c.id } })).toBe(2);
  });

  it("marcar_lista sin puestos se rechaza y no cambia el estado", async () => {
    const c = await ok<{ id: string; versionId: string }>(a.tenantId, "cpq.cotizaciones.create", { negocioId: a.negocioId, titulo: "Vacía" });
    const r = await run(a.tenantId, "cpq.cotizaciones.marcar_lista", { id: c.id });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect((await e.admin.cpqVersion.findUniqueOrThrow({ where: { id: c.versionId } })).estado).toBe("borrador");
  });

  it("respuesta del cliente: avisado_en no pisa el motivo y un seguimiento terminado queda intacto", async () => {
    const plan = (tenantId: string) =>
      e.admin.planSeguimiento.create({ data: { tenantId, nombre: `Plan ${randomUUID().slice(0, 6)}`, disparador: "manual" } });
    const seg = async (t: { tenantId: string; negocioId: string }, estado: string, motivo: string) =>
      e.admin.seguimiento.create({
        data: { tenantId: t.tenantId, negocioId: t.negocioId, planId: (await plan(t.tenantId)).id, planVersion: 1, estado, motivo, ancla: new Date(), token: randomUUID() },
      });
    const pausado = await seg(a, "pausado", "manual");
    const ganado = await seg(a, "terminado", "ganado");
    const ajeno = await seg(b, "pausado", "manual");
    const cfg = { alResponder: "pausar", alTerminar: "solo_avisar", pasos: [] } as never;
    // Sin persona (el trigger usuario_miembro exige que quien crea la nota sea miembro de la empresa).
    const c = mod.crearContexto({ tenantId: a.tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor });
    await c.transaccion((tx) => aplicarRespuesta(c, tx, pausado, cfg, { titulo: "Respondió" }));
    const r = await c.transaccion((tx) => aplicarRespuesta(c, tx, ganado, cfg, { titulo: "Tarde" }));
    expect(r).toBeNull();
    const p = await e.admin.seguimiento.findUniqueOrThrow({ where: { id: pausado.id } });
    expect(p.motivo).toBe("manual");
    expect(p.avisadoEn).toBeInstanceOf(Date);
    const g = await e.admin.seguimiento.findUniqueOrThrow({ where: { id: ganado.id } });
    expect(g).toMatchObject({ estado: "terminado", motivo: "ganado", avisadoEn: null });
    expect((await e.admin.seguimiento.findUniqueOrThrow({ where: { id: ajeno.id } })).avisadoEn).toBeNull();
  });
});
