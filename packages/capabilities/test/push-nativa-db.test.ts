import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { EmisorFcm } from "@opai/integrations";

type Capacidades = typeof ModuloCapacidades;

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
            rut: "13.131.313-3",
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
    const personaAna = await e.admin.persona.findFirst({ where: { tenantId: tenantA, usuarioId: ana } });
    await e.admin.preferenciaNotificacion.create({
      data: {
        tenantId: tenantA,
        personaId: personaAna!.id,
        preferencias: { pauta: { push: true, correo: false } },
      },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("suscribe token nativo del propio usuario y otra empresa no lo ve", async () => {
    const token = `fcm-token-${randomUUID().slice(0, 8)}`;
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
    const token = `fcm-ajeno-${randomUUID().slice(0, 8)}`;
    await mod.executeCapability(ctx(tenantA, ana), "core.push.suscribir", { tipo: "nativa", token, plataforma: "ios" });
    const r = await mod.executeCapability(ctx(tenantA, beto), "core.push.quitar", { tipo: "nativa", token });
    expect(r).toMatchObject({ ok: true, data: { quitadas: 0 } });
    expect((await e.admin.suscripcionPush.findFirst({ where: { tenantId: tenantA, token } }))?.usuarioId).toBe(ana);
  });

  it("mismo token en otro tenant no mezcla filas", async () => {
    const token = `fcm-2t-${randomUUID().slice(0, 6)}`;
    const inNat = { tipo: "nativa" as const, token, plataforma: "android" as const };
    await mod.executeCapability(ctx(tenantA, ana), "core.push.suscribir", inNat);
    await mod.executeCapability(ctx(tenantB, caro), "core.push.suscribir", inNat);
    expect(await e.admin.suscripcionPush.count({ where: { tenantId: tenantA, token } })).toBe(1);
    expect(await e.admin.suscripcionPush.count({ where: { tenantId: tenantB, token } })).toBe(1);
  });

  it("mismo token en otro usuario borra la fila anterior antes de crear", async () => {
    const token = `fcm-comp-${randomUUID().slice(0, 8)}`;
    const inNat = { tipo: "nativa" as const, token, plataforma: "android" as const };
    await mod.executeCapability(ctx(tenantA, ana), "core.push.suscribir", inNat);
    await mod.executeCapability(ctx(tenantA, beto), "core.push.suscribir", inNat);
    const filas = await e.admin.suscripcionPush.findMany({ where: { tenantId: tenantA, token } });
    expect(filas).toHaveLength(1);
    expect(filas[0]?.usuarioId).toBe(beto);
  });

  it("avisar al celular usa FCM con la ruta y borra token vencido", async () => {
    const tokenViejo = `fcm-token-viejo-${randomUUID().slice(0, 4)}`;
    const tokenOk = `fcm-token-ok-${randomUUID().slice(0, 4)}`;
    tokensVencidos.clear();
    tocados.length = 0;
    tokensVencidos.add(tokenViejo);
    await e.admin.suscripcionPush.createMany({
      data: [
        { tenantId: tenantA, usuarioId: ana, tipo: "nativa", token: tokenViejo, plataforma: "ios" },
        { tenantId: tenantA, usuarioId: ana, tipo: "nativa", token: tokenOk, plataforma: "android" },
      ],
    });
    await mod.avisarAlCelular(ctx(tenantA, ana), [ana], "pauta", "pauta", new Date(), "/trabajador/pauta");
    expect(tocados.map((t) => t.token).sort()).toEqual([tokenOk, tokenViejo].sort());
    expect(tocados.every((t) => t.ruta === "/trabajador/pauta")).toBe(true);
    const quedan = await e.admin.suscripcionPush.findMany({
      where: { tenantId: tenantA, usuarioId: ana, tipo: "nativa" },
    });
    expect(quedan.map((s) => s.token)).toEqual([tokenOk]);
  });
});