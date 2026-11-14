// Central PR 3 (CAR-469) con Postgres real: una señal abre una alerta solo con Central activa, se
// agrupa por instalación y persona, sube la severidad, respeta la regla de la empresa y es idempotente.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/central/manifest";
import { consumidoresCentral } from "../../../modules/central/trabajos";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Central · señales y reglas (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { con: "", sin: "" };
  const inst = { con: "", sin: "" };
  const persona = { con: "", sin: "" };
  const admin = randomUUID();
  const senales = consumidoresCentral.find((c) => c.id === "central.senales.recibir")!;

  const ctx = (tid: string, uid: string | null = null) =>
    mod.crearContexto({
      tenantId: tid,
      actor: uid ? { tipo: "user", id: uid } : { tipo: "system" },
      ...(uid ? { usuario: { id: uid, nombre: "A", email: `${uid.slice(0, 6)}@sen.test`, platformRole: null }, portal: "erp", portalesMembresia: ["erp"] } : {}),
      rol: "admin",
      modulosActivos: uid ? ["central"] : [],
      medidor: { registrar: async () => undefined },
    });
  const senal = (k: "con" | "sin", tipo: string, personaId: string | null = persona[k], id = randomUUID()) =>
    senales.handler(ctx(t[k]), {
      id,
      tenantId: t[k],
      tipo,
      entidadTipo: "persona",
      entidadId: personaId,
      payload: personaId ? { personaId } : { instalacionId: inst[k] },
      actorTipo: "system",
    } as never);
  const alertas = (k: "con" | "sin") => e.admin.centralAlerta.findMany({ where: { tenantId: t[k] }, orderBy: { createdAt: "asc" } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    for (const k of ["con", "sin"] as const) {
      t[k] = (await e.admin.tenant.create({ data: { slug: `sen-${k}-${randomUUID().slice(0, 8)}`, nombre: k, vertical: "seguridad" } })).id;
      const c = await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: "Cliente" } });
      inst[k] = (await e.admin.instalacion.create({ data: { tenantId: t[k], cuentaId: c.id, nombre: "Bodega" } })).id;
      persona[k] = (await e.admin.persona.create({ data: { tenantId: t[k], nombres: "Gabo", apellidos: "G", rut: "12.345.678-5" } })).id;
      const cargo = (await e.admin.cargo.create({ data: { tenantId: t[k], nombre: "Guardia" } })).id;
      await e.admin.vinculoLaboral.create({ data: { tenantId: t[k], personaId: persona[k], cargoId: cargo, instalacionId: inst[k], tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: "5x2" } });
    }
    await e.admin.tenantModule.create({ data: { tenantId: t.con, moduloId: "central", estado: "activo" } });
    await e.admin.user.create({ data: { id: admin, name: "admin", email: `${admin.slice(0, 8)}@sen.test` } });
    await e.admin.membership.create({ data: { tenantId: t.con, userId: admin, rol: "admin", portales: ["erp"] } });
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  it("sin Central activa la señal no abre nada", async () => {
    await senal("sin", "asistencia.alerta.sin_marca_inicio");
    expect(await alertas("sin")).toHaveLength(0);
  });

  it("abre una alerta en la instalación del vínculo, se agrupa y sube a crítica; el reintento no repite", async () => {
    const id = randomUUID();
    await senal("con", "asistencia.alerta.sin_marca_inicio", persona.con, id);
    await senal("con", "asistencia.alerta.sin_marca_inicio", persona.con, id);
    let a = await alertas("con");
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ instalacionId: inst.con, personaId: persona.con, severidad: "alta", origen: "asistencia.alerta.sin_marca_inicio" });
    await senal("con", "rondas.emergencia");
    a = await alertas("con");
    expect(a).toHaveLength(1);
    expect(a[0]?.severidad).toBe("critica");
    expect(await e.admin.evento.count({ where: { tenantId: t.con, tipo: "central.alerta.abierta" } })).toBe(1);
  });

  it("la regla apagada de la empresa no abre alertas; la emergencia no se puede apagar", async () => {
    const c = ctx(t.con, admin);
    const ok = await mod.executeCapability(c, "central.reglas.guardar", { evento: "rondas.ejecucion.atrasada", severidad: "baja", activa: false });
    expect(ok.ok).toBe(true);
    const no = await mod.executeCapability(c, "central.reglas.guardar", { evento: "rondas.emergencia", severidad: "critica", activa: false });
    expect(no).toMatchObject({ ok: false });
    const antes = (await alertas("con")).length;
    await senal("con", "rondas.ejecucion.atrasada", null);
    expect(await alertas("con")).toHaveLength(antes);
    const lista = await mod.executeCapability(c, "central.reglas.listar", {});
    expect(lista.ok && (lista.data as { items: { evento: string; activa: boolean }[] }).items.find((r) => r.evento === "rondas.ejecucion.atrasada")?.activa).toBe(false);
  });
});
