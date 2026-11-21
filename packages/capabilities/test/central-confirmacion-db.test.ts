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
  let instB = "";
  let adminA = "";
  let guardia = "";
  let persona = "";
  let turnoId = "";
  let otroTurno = "";

  const ctx = (tenantId: string, uid: string | null, portal: "erp" | "trabajador" = "erp") =>
    mod.crearContexto({
      tenantId,
      actor: uid ? { tipo: "user", id: uid } : { tipo: "system" },
      ...(uid
        ? { usuario: { id: uid, nombre: "P", email: `${uid.slice(0, 6)}@cf.test`, platformRole: null } }
        : {}),
      portal: uid ? portal : null,
      portalesMembresia: [portal],
      rol: portal === "erp" ? "admin" : "viewer",
      modulosActivos: ["central"],
      medidor: { registrar: async () => undefined },
    });
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
    for (const [tid, instRef] of [
      [tA, "A"],
      [tB, "B"],
    ] as const) {
      const c = await e.admin.cuenta.create({ data: { tenantId: tid, nombre: "C" } });
      const inst = await e.admin.instalacion.create({ data: { tenantId: tid, cuentaId: c.id, nombre: `I-${instRef}` } });
      if (tid === tA) instA = inst.id;
      else instB = inst.id;
    }
    adminA = randomUUID();
    guardia = randomUUID();
    await e.admin.user.create({ data: { id: adminA, name: "Admin", email: `adm-${slug}@cf.test` } });
    await e.admin.user.create({ data: { id: guardia, name: "Gina", email: `gua-${slug}@cf.test` } });
    await e.admin.membership.create({ data: { tenantId: tA, userId: adminA, rol: "admin", portales: ["erp"] } });
    await e.admin.membership.create({ data: { tenantId: tA, userId: guardia, rol: "viewer", portales: ["trabajador"] } });
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