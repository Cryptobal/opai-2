// CAR-508: responder las solicitudes de permiso y vacaciones del portal de la persona. Empresa qa-*, datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string } };

describe.skipIf(omitirSuiteDb())("Personas · responder solicitudes del portal (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  let otro = "";
  let persona = "";
  let usuario = "";
  const ctx = (tenantId: string, rol: "owner" | "viewer" = "owner") =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol,
      modulosActivos: [],
      medidor: { registrar: async () => undefined },
    });
  const run = async (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    (await mod.executeCapability(c, id, input, o)) as R;
  const solicitar = async (estado = "solicitada", aprobadaEn: Date | null = null) =>
    (
      await e.admin.ausencia.create({
        data: {
          tenantId: tenant,
          personaId: persona,
          tipo: "vacaciones",
          desde: new Date("2026-12-21"),
          hasta: new Date("2026-12-24"),
          motivo: "Viaje familiar",
          estado,
          aprobadaEn,
        },
      })
    ).id;
  const respondidas = () =>
    e.admin.evento.count({ where: { tenantId: tenant, tipo: "core.ausencia.respondida" } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.limpiarConsumidores();
    mod.registrarConsumidores(mod.consumidoresDelNucleo);
    const t = async (n: string) =>
      (
        await e.admin.tenant.create({
          data: { slug: `qa-${n}-${randomUUID().slice(0, 8)}`, nombre: n, vertical: "aseo" },
        })
      ).id;
    tenant = await t("c508");
    otro = await t("c508b");
    usuario = randomUUID();
    await e.admin.user.create({
      data: { id: usuario, name: "g", email: `g-${usuario.slice(0, 8)}@prueba.cl` },
    });
    await e.admin.membership.create({
      data: {
        tenantId: tenant,
        userId: usuario,
        rol: "viewer",
        portales: ["trabajador"],
        estado: "activa",
      },
    });
    persona = (
      await e.admin.persona.create({
        data: {
          tenantId: tenant,
          usuarioId: usuario,
          nombres: "Guardia",
          apellidos: "Ficticia",
          rut: "11111111-1",
          estado: "activa",
        },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("la lista muestra la solicitud por responder; aprobar la deja vigente una sola vez", async () => {
    const id = await solicitar();
    const lista = await run(ctx(tenant), "core.ausencias.listar", { personaId: persona });
    expect(lista.data?.["items"]).toEqual([
      expect.objectContaining({ ausenciaId: id, estado: "solicitada", dias: 0 }),
    ]);
    const vista = await run(
      ctx(tenant),
      "core.ausencias.aprobar",
      { personaId: persona, ausenciaId: id },
      { dryRun: true },
    );
    expect(vista).toMatchObject({ ok: true, data: { ausenciaId: null, desde: "2026-12-21" } });
    expect((await e.admin.ausencia.findUnique({ where: { id } }))?.estado).toBe("solicitada");
    const antes = await respondidas();
    const r = await run(ctx(tenant), "core.ausencias.aprobar", {
      personaId: persona,
      ausenciaId: id,
    });
    expect(r, JSON.stringify(r)).toMatchObject({
      ok: true,
      data: { ausenciaId: id, hasta: "2026-12-24" },
    });
    const fila = await e.admin.ausencia.findUnique({ where: { id } });
    expect(fila).toMatchObject({ estado: "aprobada", motivo: "Viaje familiar" });
    expect(fila?.aprobadaEn).not.toBeNull();
    expect(await respondidas()).toBe(antes + 1);
    // La persona recibe el aviso en la campana de su portal, sin el motivo.
    await mod.despacharPendientes(ctx(tenant));
    const aviso = await e.admin.notificacion.findFirst({
      where: { tenantId: tenant, usuarioId: usuario },
      orderBy: { createdAt: "desc" },
    });
    expect(aviso).toMatchObject({
      titulo: "Te aprobaron las vacaciones",
      enlace: "/trabajador/solicitudes",
    });
    expect(aviso?.cuerpo).toContain("21-12-2026");
    expect(aviso?.cuerpo).not.toContain("Viaje");
    const otra = await run(ctx(tenant), "core.ausencias.aprobar", {
      personaId: persona,
      ausenciaId: id,
    });
    expect(otra.error?.code).toBe("UNPROCESSABLE");
    expect(
      await e.admin.ausencia.count({ where: { tenantId: tenant, personaId: persona, id } }),
    ).toBe(1);
  });

  it("rechazar cierra la solicitud sin tocar la pauta y no se puede aprobar después", async () => {
    const id = await solicitar();
    const r = await run(ctx(tenant), "core.ausencias.rechazar", {
      personaId: persona,
      ausenciaId: id,
    });
    expect(r).toMatchObject({ ok: true, data: { ausenciaId: id, estado: "rechazada" } });
    const fila = await e.admin.ausencia.findUnique({ where: { id } });
    expect(fila?.estado).toBe("rechazada");
    expect(fila?.anuladaEn).not.toBeNull();
    const tarde = await run(ctx(tenant), "core.ausencias.aprobar", {
      personaId: persona,
      ausenciaId: id,
    });
    expect(tarde.error?.code).toBe("UNPROCESSABLE");
    const lista = await run(ctx(tenant), "core.ausencias.listar", { personaId: persona });
    expect(lista.data?.["items"]).toContainEqual(
      expect.objectContaining({ ausenciaId: id, estado: "rechazada" }),
    );
  });

  it("una solicitud retirada por la persona se lista como retirada y no se responde", async () => {
    const id = await solicitar("anulada");
    const lista = await run(ctx(tenant), "core.ausencias.listar", { personaId: persona });
    expect(lista.data?.["items"]).toContainEqual(
      expect.objectContaining({ ausenciaId: id, estado: "retirada" }),
    );
    const r = await run(ctx(tenant), "core.ausencias.rechazar", {
      personaId: persona,
      ausenciaId: id,
    });
    expect(r.error?.code).toBe("UNPROCESSABLE");
  });

  it("otra empresa no la ve y un rol sin permiso laboral no puede responder", async () => {
    const id = await solicitar();
    const ajena = await run(ctx(otro), "core.ausencias.aprobar", {
      personaId: persona,
      ausenciaId: id,
    });
    expect(ajena.error?.code).toBe("NOT_FOUND");
    const sinPermiso = await run(ctx(tenant, "viewer"), "core.ausencias.rechazar", {
      personaId: persona,
      ausenciaId: id,
    });
    expect(sinPermiso.error?.code).toBe("FORBIDDEN");
    expect((await e.admin.ausencia.findUnique({ where: { id } }))?.estado).toBe("solicitada");
  });
});
