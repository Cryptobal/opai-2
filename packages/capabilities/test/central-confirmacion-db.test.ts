// CAR-750: confirmación de turno con Postgres real (RLS, ajustes y respuestas del guardia).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/central/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Central · confirmación de turno (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tA = "";
  let tB = "";
  let instA = "";
  let instA2 = "";
  let instB = "";
  let adminA = "";
  let lectorA = "";
  let supA = "";
  let guardia = "";
  let persona = "";
  let turnoId = "";
  let otroTurno = "";

  type RolErp = "admin" | "supervisor" | "viewer";
  const ctx = (
    tenantId: string,
    uid: string | null,
    portal: "erp" | "trabajador" = "erp",
    rol: RolErp = portal === "erp" ? "admin" : "viewer",
    alcance: string[] | null = null,
  ) =>
    mod.crearContexto({
      tenantId,
      actor: uid ? { tipo: "user", id: uid } : { tipo: "system" },
      ...(uid
        ? { usuario: { id: uid, nombre: "P", email: `${uid.slice(0, 6)}@cf.test`, platformRole: null } }
        : {}),
      portal: uid ? portal : null,
      portalesMembresia: [portal],
      rol: uid ? rol : null,
      alcance: alcance ? { instalaciones: alcance } : null,
      modulosActivos: ["central"],
      medidor: { registrar: async () => undefined },
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown) => mod.executeCapability(c, id, input);
  const ok = async <T>(c: ReturnType<typeof ctx>, id: string, input: unknown): Promise<T> => {
    const r = await mod.executeCapability(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const slug = randomUUID().slice(0, 8);
    tA = (await e.admin.tenant.create({ data: { slug: `cfa-${slug}`, nombre: "A", vertical: "seguridad" } })).id;
    tB = (await e.admin.tenant.create({ data: { slug: `cfb-${slug}`, nombre: "B", vertical: "seguridad" } })).id;
    const cA = await e.admin.cuenta.create({ data: { tenantId: tA, nombre: "C" } });
    const cB = await e.admin.cuenta.create({ data: { tenantId: tB, nombre: "C" } });
    instA = (await e.admin.instalacion.create({ data: { tenantId: tA, cuentaId: cA.id, nombre: "I-A" } })).id;
    instA2 = (await e.admin.instalacion.create({ data: { tenantId: tA, cuentaId: cA.id, nombre: "I-A2" } })).id;
    instB = (await e.admin.instalacion.create({ data: { tenantId: tB, cuentaId: cB.id, nombre: "I-B" } })).id;
    adminA = randomUUID();
    lectorA = randomUUID();
    supA = randomUUID();
    guardia = randomUUID();
    for (const [id, rol, portales] of [
      [adminA, "admin", ["erp"]],
      [lectorA, "viewer", ["erp"]],
      [supA, "supervisor", ["erp"]],
      [guardia, "viewer", ["trabajador"]],
    ] as const) {
      await e.admin.user.create({ data: { id, name: rol, email: `${id.slice(0, 6)}@cf.test` } });
      await e.admin.membership.create({ data: { tenantId: tA, userId: id, rol, portales: [...portales] } });
    }
    persona = (
      await e.admin.persona.create({
        data: { tenantId: tA, usuarioId: guardia, nombres: "Gina", apellidos: "Guardia", rut: "18.888.888-8", estado: "activo" },
      })
    ).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tA, nombre: "Guardia" } })).id;
    await e.admin.vinculoLaboral.create({
      data: {
        tenantId: tA,
        personaId: persona,
        cargoId: cargo,
        instalacionId: instA,
        tipo: "indefinido",
        inicio: new Date("2026-01-01"),
        estado: "vigente",
        horasSemanales: 40,
        distribucion: "5x2",
      },
    });
    const inicio = new Date(Date.now() + 3_600_000);
    const fin = new Date(inicio.getTime() + 8 * 3_600_000);
    turnoId = (
      await e.admin.turnoEsperado.create({
        data: {
          tenantId: tA,
          personaId: persona,
          instalacionId: instA,
          fecha: inicio,
          inicio,
          fin,
          origen: "manual",
          vigente: true,
        },
      })
    ).id;
    otroTurno = (
      await e.admin.turnoEsperado.create({
        data: {
          tenantId: tB,
          personaId: (
            await e.admin.persona.create({
              data: { tenantId: tB, nombres: "O", apellidos: "Tro", rut: "19.999.999-9", estado: "activo" },
            })
          ).id,
          instalacionId: instB,
          fecha: inicio,
          inicio,
          fin,
          origen: "manual",
          vigente: true,
        },
      })
    ).id;
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar();
  });

  it("registrar abre la confirmación con plazo según ajustes del tenant", async () => {
    const r = await ok<{ id: string; plazoVenceEn: string }>(ctx(tA, adminA), "central.confirmacion.registrar", {
      turnoEsperadoId: turnoId,
    });
    const fila = await e.admin.centralConfirmacionTurno.findUniqueOrThrow({ where: { id: r.id } });
    expect([fila.estado, fila.tenantId]).toEqual(["pendiente", tA]);
    expect(fila.plazoVenceEn).not.toBeNull();
  });

  it("el guardia responde y puede cambiar la respuesta", async () => {
    const g = ctx(tA, guardia, "trabajador");
    const c = await e.admin.centralConfirmacionTurno.findFirstOrThrow({ where: { turnoEsperadoId: turnoId } });
    await ok(g, "central.confirmacion.responder", { id: c.id, respuesta: "confirmado" });
    await ok(g, "central.confirmacion.responder", { id: c.id, respuesta: "en_camino" });
    const fila = await e.admin.centralConfirmacionTurno.findUniqueOrThrow({ where: { id: c.id } });
    expect(fila.estado).toBe("en_camino");
  });

  it("«con_problema» exige motivo", async () => {
    const g = ctx(tA, guardia, "trabajador");
    const c = await e.admin.centralConfirmacionTurno.findFirstOrThrow({ where: { turnoEsperadoId: turnoId } });
    const fallo = await mod.executeCapability(g, "central.confirmacion.responder", {
      id: c.id,
      respuesta: "con_problema",
    });
    expect(fallo.ok).toBe(false);
    await ok(g, "central.confirmacion.responder", { id: c.id, respuesta: "con_problema", motivo: "Sin locomoción" });
    expect(
      (await e.admin.centralConfirmacionTurno.findUniqueOrThrow({ where: { id: c.id } })).motivo,
    ).toBe("Sin locomoción");
  });

  it("otro tenant no ve confirmaciones ajenas (RLS)", async () => {
    await e.admin.centralConfirmacionTurno.create({
      data: {
        tenantId: tB,
        turnoEsperadoId: otroTurno,
        personaId: (await e.admin.persona.findFirstOrThrow({ where: { tenantId: tB } })).id,
        instalacionId: instB,
        estado: "pendiente",
      },
    });
    const appA = e.forTenant(tA);
    const appB = e.forTenant(tB);
    expect(await appA.centralConfirmacionTurno.count()).toBe(1);
    expect(await appB.centralConfirmacionTurno.count()).toBe(1);
    expect(await appA.centralConfirmacionTurno.findMany({ where: { tenantId: tB } })).toHaveLength(0);
  });

  it("quien solo puede ver no responde por otro guardia; atender sí (B1)", async () => {
    const c = await e.admin.centralConfirmacionTurno.findFirstOrThrow({ where: { turnoEsperadoId: turnoId } });
    expect(await run(ctx(tA, lectorA, "erp", "viewer"), "central.confirmacion.responder", { id: c.id, respuesta: "confirmado" })).toMatchObject({
      ok: false,
    });
    await ok(ctx(tA, adminA, "erp", "admin"), "central.confirmacion.responder", { id: c.id, respuesta: "confirmado" });
    expect((await e.admin.centralConfirmacionTurno.findUniqueOrThrow({ where: { id: c.id } })).estado).toBe("confirmado");
  });

  it("responder, registrar y marcar sin respuesta respetan el alcance del supervisor (B2, B3)", async () => {
    const inicio = new Date(Date.now() + 7200_000);
    const fin = new Date(inicio.getTime() + 8 * 3_600_000);
    const turnoOtra = (
      await e.admin.turnoEsperado.create({
        data: {
          tenantId: tA,
          personaId: persona,
          instalacionId: instA2,
          fecha: inicio,
          inicio,
          fin,
          origen: "manual",
          vigente: true,
        },
      })
    ).id;
    const confOtra = (
      await ok<{ id: string }>(ctx(tA, adminA), "central.confirmacion.registrar", { turnoEsperadoId: turnoOtra })
    ).id;
    const sup = ctx(tA, supA, "erp", "supervisor", [instA]);
    expect(await run(sup, "central.confirmacion.responder", { id: confOtra, respuesta: "confirmado" })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(await run(sup, "central.confirmacion.registrar", { turnoEsperadoId: turnoOtra })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(await run(sup, "central.confirmacion.marcar_sin_respuesta", { id: confOtra })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    await ok(sup, "central.confirmacion.registrar", { turnoEsperadoId: turnoId });
  });

  it("no admite respuesta con turno ya empezado o estado sin_respuesta (N1)", async () => {
    const c = await e.admin.centralConfirmacionTurno.findFirstOrThrow({ where: { turnoEsperadoId: turnoId } });
    await e.admin.centralConfirmacionTurno.update({ where: { id: c.id }, data: { estado: "sin_respuesta" } });
    const g = ctx(tA, guardia, "trabajador");
    expect(await run(g, "central.confirmacion.responder", { id: c.id, respuesta: "confirmado" })).toMatchObject({ ok: false });
    await e.admin.centralConfirmacionTurno.update({ where: { id: c.id }, data: { estado: "pendiente" } });
    await e.admin.turnoEsperado.update({
      where: { id: turnoId },
      data: { inicio: new Date(Date.now() - 60_000), fin: new Date(Date.now() + 3_600_000) },
    });
    expect(await run(g, "central.confirmacion.responder", { id: c.id, respuesta: "confirmado" })).toMatchObject({ ok: false });
  });

  it("la política por instalación sobreescribe los ajustes del tenant", async () => {
    await ok(ctx(tA, adminA), "central.confirmacion.politica_guardar", {
      instalacionId: instA,
      anticipacionMin: 45,
      plazoRespuestaMin: 20,
      franja: "noche",
    });
    const p = await ok<{ anticipacionMin: number }>(ctx(tA, adminA), "central.confirmacion.politica_obtener", {
      instalacionId: instA,
    });
    expect(p.anticipacionMin).toBe(45);
  });
});