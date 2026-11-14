// CAR-356 PR 4a · Avisos al celular: suscribir y quitar son del propio usuario, el aviso toca solo sus
// dispositivos, borra las suscripciones vencidas y no cruza empresas. Contra Postgres real, sin red.
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
  const ana = randomUUID();
  const beto = randomUUID();
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
          data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" },
        })
      ).id;
    tenantA = await tenant("push-a");
    tenantB = await tenant("push-b");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("la vista previa no escribe; suscribir guarda el dispositivo del propio usuario", async () => {
    const previo = await run(ctx(tenantA, ana), "core.push.suscribir", { endpoint: "https://push.example/ana" }, { dryRun: true });
    expect(previo).toMatchObject({ ok: true, data: { suscrito: true } });
    expect(await e.admin.suscripcionPush.count({ where: { tenantId: tenantA } })).toBe(0);
    for (const endpoint of ["https://push.example/ana", "https://push.example/vieja"]) {
      expect(await run(ctx(tenantA, ana), "core.push.suscribir", { endpoint })).toMatchObject({ ok: true });
    }
    expect(await e.admin.suscripcionPush.count({ where: { tenantId: tenantA, usuarioId: ana } })).toBe(2);
    const http = await run(ctx(tenantA, ana), "core.push.suscribir", { endpoint: "http://push.example/x" });
    expect(http).toMatchObject({ ok: false });
  });

  it("otro usuario no quita una suscripción ajena y otra empresa no la ve", async () => {
    const ajeno = await run(ctx(tenantA, beto), "core.push.quitar", { endpoint: "https://push.example/ana" });
    expect(ajeno).toMatchObject({ ok: true, data: { quitadas: 0 } });
    const otra = await run(ctx(tenantB, ana), "core.push.quitar", { endpoint: "https://push.example/ana" });
    expect(otra).toMatchObject({ ok: true, data: { quitadas: 0 } });
    expect(await e.admin.suscripcionPush.count({ where: { tenantId: tenantA } })).toBe(2);
  });

  it("el aviso toca solo los dispositivos del usuario y borra la suscripción vencida", async () => {
    await mod.avisarAlCelular(ctx(tenantA, ana), [ana, beto], "pauta");
    expect(tocados.sort()).toEqual(["https://push.example/ana", "https://push.example/vieja"]);
    const quedan = await e.admin.suscripcionPush.findMany({ where: { tenantId: tenantA } });
    expect(quedan.map((s) => s.endpoint)).toEqual(["https://push.example/ana"]);
    expect(quedan[0]?.ultimoAvisoEn).not.toBeNull();
    tocados.length = 0;
    await mod.avisarAlCelular(ctx(tenantB, ana), [ana], "pauta");
    expect(tocados).toEqual([]);
  });

  it("quitar borra la suscripción propia", async () => {
    const r = await run(ctx(tenantA, ana), "core.push.quitar", { endpoint: "https://push.example/ana" });
    expect(r).toMatchObject({ ok: true, data: { quitadas: 1 } });
  });
});
