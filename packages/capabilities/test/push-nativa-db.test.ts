import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { EmisorFcm } from "@opai/integrations";

type Capacidades = typeof ModuloCapacidades;

const rutPrueba = () =>
  `${parseInt(randomUUID().replace(/-/g, "").slice(0, 10), 16) % 90_000_000 + 10_000_000}-K`;
const tokenFcmPrueba = (etiqueta: string) => `fcm-${etiqueta}-${randomUUID().replace(/-/g, "")}`;

describe.skipIf(!urlPropietario)("Núcleo · push nativa (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantA = "";
  let tenantB = "";
  let ana = "";
  let beto = "";
  let caro = "";
  const tocados: { token: string; ruta: string }[] = [];
  const tokensVencidos = new Set<string>();
  const emisorNativo: EmisorFcm = {
    async avisar(token, _plataforma, ruta) {
      tocados.push({ token, ruta });
      const vencida = tokensVencidos.has(token);
      return { ok: !vencida, estado: vencida ? 404 : 200, vencida };
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
      servicios: { pushNativo: emisorNativo },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    const crearTenant = async (s: string) =>
      (
        await e.admin.tenant.create({
          data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" },
        })
      ).id;
    tenantA = await crearTenant("push-nat-a");
    tenantB = await crearTenant("push-nat-b");
    const usuarioEn = async (tenantId: string, nombre: string, persona = tenantId === tenantA) => {
      const id = (
        await e.admin.user.create({
          data: { name: nombre, email: `${nombre}-${randomUUID().slice(0, 8)}@prueba.cl`, emailVerified: true },
        })
      ).id;
      await e.admin.membership.create({ data: { tenantId, userId: id, rol: "viewer", portales: ["trabajador"] } });
      if (persona) {
        await e.admin.persona.create({
          data: {
            tenantId: tenantA,
            nombres: nombre,
            apellidos: "Prueba",
            rut: rutPrueba(),
            estado: "activo",
            usuarioId: id,
          },
        });
      }
      return id;
    };
    ana = await usuarioEn(tenantA, "ana-nat");
    beto = await usuarioEn(tenantA, "beto-nat");
    caro = await usuarioEn(tenantB, "caro-nat", false);
    const pAna = (await e.admin.persona.findFirst({ where: { tenantId: tenantA, usuarioId: ana } }))!.id;
    await e.admin.preferenciaNotificacion.create({
      data: { tenantId: tenantA, personaId: pAna, preferencias: { pauta: { push: true, correo: false } } },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("suscribe token FCM de iOS (no APNs hex) del propio usuario", async () => {
    const token = `d${randomUUID().replace(/-/g, "").slice(0, 20)}:APA91b${randomUUID().replace(/-/g, "").slice(0, 40)}`;
    const r = await mod.executeCapability(
      ctx(tenantA, ana),
      "core.push.suscribir",
      { tipo: "nativa", token, plataforma: "ios", dispositivo: "iPhone" },
    );
    expect(r).toMatchObject({ ok: true });
    const fila = await e.admin.suscripcionPush.findFirst({ where: { tenantId: tenantA, token } });
    expect(fila).toMatchObject({ plataforma: "ios", usuarioId: ana });
  });

  it("suscribe token nativo del propio usuario y otra empresa no lo ve", async () => {
    const token = tokenFcmPrueba("token");
    const r = await mod.executeCapability(
      ctx(tenantA, ana),
      "core.push.suscribir",
      { tipo: "nativa", token, plataforma: "android", dispositivo: "Android" },
    );
    expect(r).toMatchObject({ ok: true });
    const propias = await e.admin.suscripcionPush.findMany({ where: { tenantId: tenantA, usuarioId: ana } });
    expect(propias).toHaveLength(1);
    expect(propias[0]).toMatchObject({ tipo: "nativa", token, plataforma: "android" });
    const ajena = await e.admin.suscripcionPush.findMany({ where: { tenantId: tenantB, token } });
    expect(ajena).toHaveLength(0);
  });

  it("otro usuario no puede quitar el token ajeno", async () => {
    const token = tokenFcmPrueba("ajeno");
    await mod.executeCapability(ctx(tenantA, ana), "core.push.suscribir", { tipo: "nativa", token, plataforma: "ios" });
    const r = await mod.executeCapability(ctx(tenantA, beto), "core.push.quitar", { tipo: "nativa", token });
    expect(r).toMatchObject({ ok: true, data: { quitadas: 0 } });
    expect((await e.admin.suscripcionPush.findFirst({ where: { tenantId: tenantA, token } }))?.usuarioId).toBe(ana);
  });

  it("mismo token en otro tenant no mezcla filas", async () => {
    const token = tokenFcmPrueba("2t");
    const inNat = { tipo: "nativa" as const, token, plataforma: "android" as const };
    await mod.executeCapability(ctx(tenantA, ana), "core.push.suscribir", inNat);
    await mod.executeCapability(ctx(tenantB, caro), "core.push.suscribir", inNat);
    const [enA, enB] = await Promise.all([
      e.admin.suscripcionPush.count({ where: { tenantId: tenantA, token } }),
      e.admin.suscripcionPush.count({ where: { tenantId: tenantB, token } }),
    ]);
    expect([enA, enB]).toEqual([1, 1]);
  });

  it("mismo token en otro usuario borra la fila anterior antes de crear", async () => {
    const token = tokenFcmPrueba("comp");
    const inNat = { tipo: "nativa" as const, token, plataforma: "android" as const };
    await mod.executeCapability(ctx(tenantA, ana), "core.push.suscribir", inNat);
    await mod.executeCapability(ctx(tenantA, beto), "core.push.suscribir", inNat);
    const filas = await e.admin.suscripcionPush.findMany({ where: { tenantId: tenantA, token } });
    expect(filas).toHaveLength(1);
    expect(filas[0]?.usuarioId).toBe(beto);
  });

  it("avisar al celular usa FCM con la ruta y borra token vencido", async () => {
    const sufijo = randomUUID().slice(0, 8);
    const usuarioAviso = (
      await e.admin.user.create({
        data: {
          name: `avisos-${sufijo}`,
          email: `avisos-${sufijo}@prueba.cl`,
          emailVerified: true,
        },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId: tenantA, userId: usuarioAviso, rol: "viewer", portales: ["trabajador"] },
    });
    const personaAviso = (
      await e.admin.persona.create({
        data: {
          tenantId: tenantA,
          nombres: "Aviso",
          apellidos: sufijo,
          rut: rutPrueba(),
          estado: "activo",
          usuarioId: usuarioAviso,
        },
      })
    ).id;
    await e.admin.preferenciaNotificacion.create({
      data: { tenantId: tenantA, personaId: personaAviso, preferencias: { pauta: { push: true, correo: false } } },
    });

    const tokenViejo = tokenFcmPrueba("viejo");
    const tokenOk = tokenFcmPrueba("ok");
    const delCaso = new Set([tokenViejo, tokenOk]);
    tokensVencidos.clear();
    tocados.length = 0;
    tokensVencidos.add(tokenViejo);
    await e.admin.suscripcionPush.createMany({
      data: [
        { tenantId: tenantA, usuarioId: usuarioAviso, tipo: "nativa", token: tokenViejo, plataforma: "ios" },
        { tenantId: tenantA, usuarioId: usuarioAviso, tipo: "nativa", token: tokenOk, plataforma: "android" },
      ],
    });
    await mod.avisarAlCelular(
      ctx(tenantA, usuarioAviso),
      [usuarioAviso],
      "pauta",
      "pauta",
      new Date(),
      "/trabajador/pauta",
    );
    const tocadosCaso = tocados.filter((t) => delCaso.has(t.token));
    expect(tocadosCaso.map((t) => t.token).sort()).toEqual([tokenOk, tokenViejo].sort());
    expect(tocadosCaso.every((t) => t.ruta === "/trabajador/pauta")).toBe(true);
    const quedan = await e.admin.suscripcionPush.findMany({
      where: { tenantId: tenantA, usuarioId: usuarioAviso, tipo: "nativa", token: { in: [...delCaso] } },
    });
    expect(quedan.map((s) => s.token)).toEqual([tokenOk]);
  });
});