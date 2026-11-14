// CAR-352 · destinos de eventos salientes contra Postgres real, con RLS (rol sin BYPASSRLS) y dos
// empresas ficticias: el secreto sale una sola vez, se guarda cifrado y nada cruza de empresa.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
type Capacidades = typeof ModuloCapacidades;
type Destino = {
  id: string;
  url: string;
  eventos: string[];
  activo: boolean;
  secretoSufijo: string;
};
type Creado = Destino & { secreto: string | null };

describe.skipIf(!urlPropietario)("destinos de eventos salientes (CAR-352)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "" };
  const u = { a: "", b: "" };

  beforeAll(async () => {
    process.env.OPAI_SECRETS_KEY = randomBytes(32).toString("base64");
    process.env.OPAI_SECRETS_KEY_VERSION = "99"; // fuera del alcance de la prueba de rotación de KEK (versión 2)
    delete process.env.OPAI_SECRETS_KEY_ANTERIOR;
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const sufijo = randomUUID().slice(0, 8);
    for (const lado of ["a", "b"] as const) {
      const slug = `wh-${lado}-${sufijo}`;
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

  const ctx = (lado: "a" | "b", alcance: string[] | null = null) =>
    mod.crearContexto({
      tenantId: t[lado],
      actor: { tipo: "user", id: u[lado] },
      usuario: { id: u[lado], nombre: "x", email: "x@prueba.test", platformRole: null },
      rol: "admin",
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
      ...(alcance ? { alcance: { instalaciones: alcance } } : {}),
    });

  async function dato<T>(lado: "a" | "b", id: string, input: unknown, opciones = {}) {
    const r = await mod.executeCapability(ctx(lado), id, input, opciones);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  async function falla(lado: "a" | "b", id: string, input: unknown, code: string) {
    const r = await mod.executeCapability(ctx(lado), id, input);
    expect(r, id).toMatchObject({ ok: false, error: { code } });
  }
  const nuevo = { url: "https://hooks.ejemplo.cl/opai", eventos: ["core.cuenta.creada"] };

  it("la vista previa no escribe ni entrega secreto", async () => {
    const d = await dato<Creado>("a", "core.webhooks.destino_crear", nuevo, { dryRun: true });
    expect(d).toMatchObject({ id: "", secreto: null });
    expect(await e.admin.webhookDestino.count({ where: { tenantId: t.a } })).toBe(0);
  });

  it("crea, devuelve el secreto una vez y lo guarda cifrado", async () => {
    const d = await dato<Creado>("a", "core.webhooks.destino_crear", nuevo);
    expect(d.secreto).toMatch(/^whsec_[A-Za-z0-9_-]{43}$/);
    expect(d.secretoSufijo).toBe(d.secreto?.slice(-4));
    const fila = await e.admin.webhookDestino.findUniqueOrThrow({ where: { id: d.id } });
    expect(Buffer.from(fila.secretoCifrado).toString("utf8")).not.toContain(d.secreto ?? "x");
    const lista = await dato<{ items: Destino[] }>("a", "core.webhooks.destinos_list", {});
    expect(lista.items.map((i) => i.id)).toEqual([d.id]);
    expect(JSON.stringify(lista)).not.toContain(d.secreto ?? "x");
    const audit = await e.admin.auditEvent.findMany({ where: { tenantId: t.a } });
    expect(JSON.stringify(audit)).not.toContain(d.secreto ?? "x");
  });

  it("rechaza direcciones internas y eventos fuera del catálogo", async () => {
    for (const url of [
      "http://hooks.ejemplo.cl",
      "https://169.254.169.254/x",
      "https://localhost/x",
    ]) {
      await falla("a", "core.webhooks.destino_crear", { ...nuevo, url }, "UNPROCESSABLE");
    }
    await falla(
      "a",
      "core.webhooks.destino_crear",
      { ...nuevo, eventos: ["no.existe"] },
      "UNPROCESSABLE",
    );
  });

  it("guarda la dirección en su forma canónica", async () => {
    const d = await dato<Creado>("a", "core.webhooks.destino_crear", {
      ...nuevo,
      url: "HTTPS://Hooks.Ejemplo.CL/Canonica",
    });
    expect(d.url).toBe("https://hooks.ejemplo.cl/Canonica");
  });

  it("rota el secreto, pausa y elimina", async () => {
    const d = await dato<Creado>("a", "core.webhooks.destino_crear", nuevo);
    const r = await dato<Creado>("a", "core.webhooks.destino_rotar_secreto", { id: d.id });
    expect(r.secreto).not.toBe(d.secreto);
    const p = await dato<Destino>("a", "core.webhooks.destino_actualizar", {
      id: d.id,
      activo: false,
    });
    expect(p.activo).toBe(false);
    await dato("a", "core.webhooks.destino_eliminar", { id: d.id });
    expect(await e.admin.webhookDestino.count({ where: { id: d.id } })).toBe(0);
  });

  it("otra empresa no ve ni toca el destino", async () => {
    const d = await dato<Creado>("a", "core.webhooks.destino_crear", nuevo);
    const lista = await dato<{ items: Destino[] }>("b", "core.webhooks.destinos_list", {});
    expect(lista.items).toEqual([]);
    for (const id of ["core.webhooks.destino_rotar_secreto", "core.webhooks.destino_eliminar"]) {
      await falla("b", id, { id: d.id }, "NOT_FOUND");
    }
    await falla("b", "core.webhooks.destino_actualizar", { id: d.id, activo: false }, "NOT_FOUND");
  });

  it("quien tiene alcance acotado no administra destinos", async () => {
    const r = await mod.executeCapability(
      ctx("a", [randomUUID()]),
      "core.webhooks.destinos_list",
      {},
    );
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
