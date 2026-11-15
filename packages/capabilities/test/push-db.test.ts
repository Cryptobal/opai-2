// CAR-356 PR 4a · Avisos al celular: suscribir y quitar son del propio usuario, el aviso toca solo a quien eligió
// push en esa categoría y fuera de su silencio, solo sus dispositivos, borra las suscripciones vencidas y no cruza empresas. Contra Postgres real, sin red.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { EmisorPush } from "@opai/integrations";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("Núcleo · avisos al celular (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantA = "";
  let tenantB = "";
  let ana = "";
  let beto = "";
  const tocados: string[] = [];
  const emisor: EmisorPush = {
    async avisar(endpoint) {
      tocados.push(endpoint);
      const vencida = endpoint.endsWith("/vieja");
      return { ok: !vencida, estado: vencida ? 410 : 201, vencida };
    },
  };
  const ctx = (tenantId: string, usuario: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      portal: "trabajador",
      portalesMembresia: ["trabajador"],
      rol: "viewer",
      modulosActivos: [],
      medidor: { registrar: async () => undefined },
      servicios: { push: emisor },
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    const tenant = async (slug: string) =>
      (
        await e.admin.tenant.create({
          data: {
            slug: `${slug}-${randomUUID().slice(0, 8)}`,
            nombre: slug,
            vertical: "seguridad",
          },
        })
      ).id;
    tenantA = await tenant("push-a");
    tenantB = await tenant("push-b");
    // Usuarios con persona en A (trigger usuario_miembro: deben ser miembros). Ana eligió push de pauta con
    // silencio de 22:00 a 07:00; Beto no eligió nada (por defecto, sin canal externo).
    const usuario = async (nombre: string, rut: string) => {
      const id = (
        await e.admin.user.create({
          data: {
            name: nombre,
            email: `${nombre}-${randomUUID().slice(0, 8)}@prueba.cl`,
            emailVerified: true,
          },
        })
      ).id;
      await e.admin.membership.create({
        data: { tenantId: tenantA, userId: id, rol: "viewer", portales: ["trabajador"] },
      });
      const persona = await e.admin.persona.create({
        data: {
          tenantId: tenantA,
          nombres: nombre,
          apellidos: "Prueba",
          rut,
          estado: "activa",
          usuarioId: id,
        },
      });
      return { id, persona: persona.id };
    };
    const a = await usuario("ana", "11.111.111-1");
    ana = a.id;
    beto = (await usuario("beto", "12.121.212-1")).id;
    await e.admin.preferenciaNotificacion.create({
      data: {
        tenantId: tenantA,
        personaId: a.persona,
        preferencias: { pauta: { push: true, correo: false } },
        silencioDesde: "22:00",
        silencioHasta: "07:00",
      },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("la vista previa no escribe; suscribir guarda el dispositivo del propio usuario", async () => {
    const previo = await run(
      ctx(tenantA, ana),
      "core.push.suscribir",
      { endpoint: "https://fcm.googleapis.com/fcm/send/ana" },
      { dryRun: true },
    );
    expect(previo).toMatchObject({ ok: true, data: { suscrito: true } });
    expect(await e.admin.suscripcionPush.count({ where: { tenantId: tenantA } })).toBe(0);
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/ana",
      "https://fcm.googleapis.com/fcm/send/vieja",
    ]) {
      expect(await run(ctx(tenantA, ana), "core.push.suscribir", { endpoint })).toMatchObject({
        ok: true,
      });
    }
    expect(
      await e.admin.suscripcionPush.count({ where: { tenantId: tenantA, usuarioId: ana } }),
    ).toBe(2);
    const ajeno = await run(ctx(tenantA, ana), "core.push.suscribir", {
      endpoint: "https://ejemplo.cl/x",
    });
    expect(ajeno).toMatchObject({ ok: false });
  });

  it("otro usuario no quita una suscripción ajena y otra empresa no la ve", async () => {
    const ajeno = await run(ctx(tenantA, beto), "core.push.quitar", {
      endpoint: "https://fcm.googleapis.com/fcm/send/ana",
    });
    expect(ajeno).toMatchObject({ ok: true, data: { quitadas: 0 } });
    const otra = await run(ctx(tenantB, ana), "core.push.quitar", {
      endpoint: "https://fcm.googleapis.com/fcm/send/ana",
    });
    expect(otra).toMatchObject({ ok: true, data: { quitadas: 0 } });
    expect(
      await e.admin.suscripcionPush.count({ where: { tenantId: tenantA, usuarioId: ana } }),
    ).toBe(2);
  });

  it("el aviso respeta la preferencia y el silencio, toca solo a quien eligió push y borra la vencida", async () => {
    // Beto también tiene un dispositivo, pero no eligió push: no se le toca.
    await e.admin.suscripcionPush.create({
      data: {
        tenantId: tenantA,
        usuarioId: beto,
        endpoint: "https://fcm.googleapis.com/fcm/send/beto",
      },
    });
    const medianoche = new Date("2026-11-14T03:00:00Z"); // 00:00 en Santiago: silencio de Ana.
    await mod.avisarAlCelular(ctx(tenantA, ana), [ana, beto], "pauta", "pauta", medianoche);
    expect(tocados).toEqual([]);
    await mod.avisarAlCelular(ctx(tenantA, ana), [ana, beto], "documentos", "pauta");
    expect(tocados).toEqual([]);
    const mediodia = new Date("2026-11-14T15:00:00Z"); // 12:00 en Santiago.
    await mod.avisarAlCelular(ctx(tenantA, ana), [ana, beto], "pauta", "pauta", mediodia);
    expect(tocados.sort()).toEqual([
      "https://fcm.googleapis.com/fcm/send/ana",
      "https://fcm.googleapis.com/fcm/send/vieja",
    ]);
    const quedan = await e.admin.suscripcionPush.findMany({
      where: { tenantId: tenantA, usuarioId: ana },
    });
    expect(quedan.map((s) => s.endpoint)).toEqual(["https://fcm.googleapis.com/fcm/send/ana"]);
    expect(quedan[0]?.ultimoAvisoEn).not.toBeNull();
    tocados.length = 0;
    await mod.avisarAlCelular(ctx(tenantB, ana), [ana], "pauta", "pauta", mediodia);
    expect(tocados).toEqual([]);
  });

  it("quitar borra la suscripción propia", async () => {
    const r = await run(ctx(tenantA, ana), "core.push.quitar", {
      endpoint: "https://fcm.googleapis.com/fcm/send/ana",
    });
    expect(r).toMatchObject({ ok: true, data: { quitadas: 1 } });
  });
});
