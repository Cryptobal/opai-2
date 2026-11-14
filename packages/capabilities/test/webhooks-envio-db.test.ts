// CAR-352 parte 2 · del outbox al destino contra Postgres real, con RLS y dos empresas ficticias.
// El envío HTTP se reemplaza por uno falso: aquí se prueba qué se anota, qué se firma y qué se reintenta.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { firmaWebhook } from "@opai/integrations";

import type * as ModuloCapacidades from "../src";
import { enviador } from "../src/core/webhooks/envio";
type Capacidades = typeof ModuloCapacidades;
type Envio = Parameters<typeof enviador.enviar>[0];

describe.skipIf(!urlPropietario)("envío de eventos salientes (CAR-352)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "" };
  const u = { a: "", b: "" };
  const enviados: Envio[] = [];
  let responde = { ok: true, codigo: 200 as number | null, error: null as string | null };

  beforeAll(async () => {
    process.env.OPAI_SECRETS_KEY = randomBytes(32).toString("base64");
    process.env.OPAI_SECRETS_KEY_VERSION = "1";
    delete process.env.OPAI_SECRETS_KEY_ANTERIOR;
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.limpiarConsumidores();
    mod.registrarConsumidores(
      mod.consumidoresDelNucleo.filter((c) => c.id === "core.webhooks.anotar"),
    );
    enviador.enviar = async (envio) => {
      enviados.push(envio);
      return { ...responde, duracionMs: 1 };
    };
    const sufijo = randomUUID().slice(0, 8);
    for (const lado of ["a", "b"] as const) {
      const slug = `whe-${lado}-${sufijo}`;
      t[lado] = (
        await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "aseo" } })
      ).id;
      u[lado] = (
        await e.admin.user.create({ data: { name: lado, email: `${slug}@prueba.test` } })
      ).id;
      await e.admin.membership.create({
        data: { tenantId: t[lado], userId: u[lado], rol: "admin", portales: ["erp"] },
      });
    }
  });

  afterAll(async () => await e?.cerrar());

  const ctx = (lado: "a" | "b") =>
    mod.crearContexto({
      tenantId: t[lado],
      actor: { tipo: "user", id: u[lado] },
      usuario: { id: u[lado], nombre: "x", email: "x@prueba.test", platformRole: null },
      rol: "admin",
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });
  async function dato<T>(lado: "a" | "b", id: string, input: unknown) {
    const r = await mod.executeCapability(ctx(lado), id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const crear = (lado: "a" | "b", eventos: string[], url = "https://hooks.ejemplo.cl/x") =>
    dato<{ id: string; secreto: string }>(lado, "core.webhooks.destino_crear", { url, eventos });
  const emitir = (lado: "a" | "b", tipo: string) =>
    e.admin.evento.create({
      data: {
        tenantId: t[lado],
        tipo,
        entidadTipo: "cuenta",
        entidadId: randomUUID(),
        actorTipo: "system",
        payload: { nombre: "dato que no debe salir" },
      },
    });
  const enviar = (lado: "a" | "b") =>
    mod.trabajosDelNucleo.find((x) => x.tipo === "core.webhooks.enviar")!.ejecutar(ctx(lado), {});

  it("anota solo los destinos activos suscritos y envía firmado, sin el contenido", async () => {
    const suscrito = await crear("a", ["core.cuenta.creada"]);
    await crear("a", ["core.cuenta.archivada"]);
    const pausado = await crear("a", ["core.cuenta.creada"], "https://otro.ejemplo.cl/x");
    await dato("a", "core.webhooks.destino_actualizar", { id: pausado.id, activo: false });
    const ev = await emitir("a", "core.cuenta.creada");
    await mod.despacharPendientes(ctx("a"));
    const entregas = await e.admin.webhookEntrega.findMany({ where: { eventoId: ev.id } });
    expect(entregas.map((x) => x.destinoId)).toEqual([suscrito.id]);

    await enviar("a");
    expect(enviados).toHaveLength(1);
    const envio = enviados[0]!;
    expect(envio.cuerpo).not.toContain("dato que no debe salir");
    expect(JSON.parse(envio.cuerpo)).toMatchObject({ id: ev.id, tipo: "core.cuenta.creada" });
    const segundos = Math.floor((envio.ahora ?? new Date()).getTime() / 1000);
    expect(firmaWebhook(envio.secreto, segundos, envio.cuerpo)).toBe(
      firmaWebhook(suscrito.secreto, segundos, envio.cuerpo),
    );
    const hecha = await e.admin.webhookEntrega.findFirstOrThrow({ where: { eventoId: ev.id } });
    expect(hecha).toMatchObject({ estado: "ok", intentos: 1, ultimoCodigo: 200 });
  });

  it("si el destino falla, reintenta con espera y se puede reenviar a mano", async () => {
    enviados.length = 0;
    responde = { ok: false, codigo: 500, error: "Respondió 500" };
    const ev = await emitir("a", "core.cuenta.creada");
    await mod.despacharPendientes(ctx("a"));
    await enviar("a");
    const fallida = await e.admin.webhookEntrega.findFirstOrThrow({ where: { eventoId: ev.id } });
    expect(fallida).toMatchObject({ estado: "pendiente", intentos: 1, ultimoCodigo: 500 });
    expect(fallida.proximoIntentoEn.getTime()).toBeGreaterThan(Date.now() + 30_000);
    await enviar("a");
    expect(enviados).toHaveLength(1);

    responde = { ok: true, codigo: 204, error: null };
    await dato("a", "core.webhooks.entrega_reenviar", { id: fallida.id });
    await enviar("a");
    const lista = await dato<{ items: { id: string; estado: string }[] }>(
      "a",
      "core.webhooks.entregas_list",
      { estado: "ok" },
    );
    expect(lista.items.map((x) => x.id)).toContain(fallida.id);
  });

  it("otra empresa no recibe ni ve las entregas", async () => {
    enviados.length = 0;
    await emitir("b", "core.cuenta.creada");
    await mod.despacharPendientes(ctx("b"));
    await enviar("b");
    expect(enviados).toHaveLength(0);
    const lista = await dato<{ items: unknown[] }>("b", "core.webhooks.entregas_list", {});
    expect(lista.items).toEqual([]);
    const deA = await e.admin.webhookEntrega.findFirstOrThrow({ where: { tenantId: t.a } });
    const r = await mod.executeCapability(ctx("b"), "core.webhooks.entrega_reenviar", {
      id: deA.id,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
