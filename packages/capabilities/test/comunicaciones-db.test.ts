// Configuración y comunicaciones contra Postgres real (RLS, claves compuestas, outbox real).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { Correo } from "../src/testing/tipos";

describe.skipIf(!urlPropietario)("configuración y comunicaciones en base real", () => {
  let e: Entorno;
  let tenantId = "";
  let userId = "";
  let mod: typeof ModuloCapacidades;
  const correos: Correo[] = [];

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.limpiarConsumidores();
    mod.registrarConsumidores(mod.consumidoresDelNucleo);
    const sufijo = randomUUID().slice(0, 8);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `com-${sufijo}`, nombre: "Com", vertical: "seguridad" },
      })
    ).id;
    userId = (
      await e.admin.user.create({
        data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId, userId, rol: "owner", portales: ["erp"] },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      portal: "erp",
      portalesMembresia: ["erp"],
      usuario: { id: userId, nombre: "Ana", email: "ana@prueba.cl", platformRole: null },
      rol: "owner",
      medidor: { registrar: async () => undefined },
      servicios: { correo: { nombre: "memoria", enviar: async (c) => void correos.push(c) } },
    });

  async function dato<T>(id: string, input: unknown): Promise<T> {
    const r = await mod.executeCapability(ctx(), id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  it("ajustes por ámbito, regla y entrega desde el outbox", async () => {
    await dato("core.config.set", {
      modulo: "core",
      clave: "documentos_tamano_maximo_mb",
      valor: 12,
    });
    await dato("core.config.set", { modulo: "core", clave: "preferencias_tema", valor: "claro" });
    const vs = await dato<{ clave: string; origen: string }[]>("core.config.get", {
      modulo: "core",
    });
    expect(vs.find((v) => v.clave === "preferencias_tema")?.origen).toBe("usuario");
    await dato("core.notificacion_reglas.set", {
      evento: "core.integracion.error",
      canal: "inapp",
      roles: ["owner"],
      usuarios: [],
      activa: true,
    });
    const r = await dato<{ ok: boolean }>("core.integraciones.probar", {
      proveedor: "google_maps",
    });
    expect(r.ok).toBe(false);
    await mod.despacharPendientes(ctx());
    const inbox = await dato<{ noLeidas: number }>("core.notificaciones.list", {});
    expect(inbox.noLeidas).toBe(1);
  });

  it("pagina más de 50 avisos propios sin truncar el total ni aceptar cursores ajenos", async () => {
    const usuarioId = randomUUID();
    const tenantB = await e.admin.tenant.create({ data: {
      slug: `avisos-${randomUUID()}`, nombre: "Otra empresa", vertical: "seguridad",
    } });
    const fecha = new Date("2026-10-27T00:00:00.000Z");
    const ids = Array.from({ length: 80 }, () => randomUUID());
    const otroUsuario = randomUUID();
    const otroTenant = randomUUID();
    await e.admin.notificacion.createMany({ data: [
      ...ids.map((id) => ({ id, tenantId, usuarioId, titulo: "Aviso propio", createdAt: fecha })),
      { id: otroUsuario, tenantId, usuarioId: randomUUID(), titulo: "Otro usuario" },
      { id: otroTenant, tenantId: tenantB.id, usuarioId, titulo: "Otro tenant" },
    ] });
    const contexto = { ...ctx(), actor: { tipo: "user" as const, id: usuarioId } };
    async function pagina(antesDe?: string) {
      const r = await mod.executeCapability(contexto, "core.notificaciones.list", {
        soloNoLeidas: true, limite: 50, ...(antesDe ? { antesDe } : {}),
      });
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.data as { items: { id: string }[]; noLeidas: number };
    }
    const primera = await pagina();
    expect(primera.items).toHaveLength(50);
    expect(primera.noLeidas).toBe(80);
    // Otra pestaña puede leer el último aviso antes de pedir la página siguiente.
    await e.admin.notificacion.update({ where: { id: primera.items.at(-1)!.id }, data: { leidaEn: new Date() } });
    const segunda = await pagina(primera.items.at(-1)?.id);
    expect(segunda.items).toHaveLength(30);
    expect(segunda.noLeidas).toBe(79);
    expect(new Set([...primera.items, ...segunda.items].map((a) => a.id))).toEqual(new Set(ids));
    for (const antesDe of [otroUsuario, otroTenant, randomUUID()]) {
      const r = await mod.executeCapability(contexto, "core.notificaciones.list", { antesDe });
      expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    }
  });
});
