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
});
