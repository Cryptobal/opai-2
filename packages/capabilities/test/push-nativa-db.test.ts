// Suscripción push nativa y aislamiento entre empresas (misma vara que push-db.test.ts).
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
  const tocados: { token: string; ruta: string }[] = [];
  const emisorNativo: EmisorFcm = {
    async avisar(token, _plataforma, ruta) {
      tocados.push({ token, ruta });
      const vencida = token.endsWith("viejo");
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
    const usuario = async (nombre: string) => {
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
          rut: "13.131.313-3",
          estado: "activo",
          usuarioId: id,
        },
      });
      return { id, persona: persona.id };
    };
    const a = await usuario("ana-nat");
    ana = a.id;
    await e.admin.preferenciaNotificacion.create({
      data: {
        tenantId: tenantA,
        personaId: a.persona,
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

  it("avisar al celular usa FCM con la ruta y borra token vencido", async () => {
    const tokenViejo = `fcm-token-viejo-${randomUUID().slice(0, 4)}`;
    const tokenOk = `fcm-token-ok-${randomUUID().slice(0, 4)}`;
    await e.admin.suscripcionPush.createMany({
      data: [
        { tenantId: tenantA, usuarioId: ana, tipo: "nativa", token: tokenViejo, plataforma: "ios" },
        { tenantId: tenantA, usuarioId: ana, tipo: "nativa", token: tokenOk, plataforma: "android" },
      ],
    });
    await mod.avisarAlCelular(ctx(tenantA, ana), [ana], "pauta", "pauta", new Date(), "/trabajador/pauta");
    expect(tocados.map((t) => t.token).sort()).toEqual([tokenOk, tokenViejo].sort());
    expect(tocados[0]?.ruta).toBe("/trabajador/pauta");
    const quedan = await e.admin.suscripcionPush.findMany({
      where: { tenantId: tenantA, usuarioId: ana, tipo: "nativa" },
    });
    expect(quedan.map((s) => s.token)).toEqual([tokenOk]);
  });
});