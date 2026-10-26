// Roles personalizados y excepciones contra Postgres real (si hay DATABASE_URL_TEST): las mismas
// capacidades de UI/API/MCP, con RLS (rol sin BYPASSRLS), y la resolución efectiva que usa el borde.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("roles y excepciones en base real", () => {
  let e: Entorno;
  let tenantId = "";
  let userId = "";
  let membershipId = "";
  let mod: Capacidades;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const t = await e.admin.tenant.create({
      data: { slug: `perm-${randomUUID().slice(0, 8)}`, nombre: "P", vertical: "seguridad" },
    });
    tenantId = t.id;
    const u = await e.admin.user.create({
      data: { id: randomUUID(), name: "Vic", email: `vic-${randomUUID().slice(0, 8)}@prueba.cl` },
    });
    userId = u.id;
    membershipId = (
      await e.admin.membership.create({
        data: { tenantId, userId, rol: "viewer", portales: ["erp"] },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctxOwner = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  /** Contexto del usuario tal como lo arma el borde: rol base + rol personalizado + excepciones. */
  async function ctxUsuario() {
    const m = await e
      .forTenant(tenantId)
      .membership.findUnique({ where: { id: membershipId }, include: { rolTenant: true, excepciones: true } });
    return mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Vic", email: "vic@prueba.cl", platformRole: null },
      rol: "viewer",
      // Igual que el borde (fuentes.ts): rol archivado deniega por defecto; sin rol, el rol base.
      permisosRol: m?.rolTenant ? (m.rolTenant.archivadoEn ? [] : m.rolTenant.permisos) : null,
      excepciones: (m?.excepciones ?? []).map((x) => ({ permiso: x.permiso, conceder: x.conceder })),
      medidor: { registrar: async () => undefined },
    });
  }

  async function dato<T>(id: string, input: unknown, opciones = {}): Promise<T> {
    const r = await mod.executeCapability(ctxOwner(), id, input, opciones);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  it("owner crea y asigna un rol personalizado; el usuario queda con sus permisos efectivos", async () => {
    const rol = await dato<{ id: string }>("core.roles.create", {
      nombre: "Central de monitoreo",
      permisos: ["core:instalaciones.read", "core:cuentas.read"],
    });
    // Un viewer no gestiona keys; con el rol asignado tampoco, pero sí lee instalaciones.
    const antes = await mod.executeCapability(await ctxUsuario(), "core.users.list", {});
    expect(antes).toMatchObject({ ok: true }); // viewer base lee usuarios (users.read)

    await dato("core.roles.assign", { membershipId, roleId: rol.id });
    const conRol = await ctxUsuario();
    // Ahora manda el rol personalizado (no incluye users.read): no lista usuarios.
    expect(await mod.executeCapability(conRol, "core.users.list", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    // Pero sí lee instalaciones (su rol lo concede).
    expect(await mod.executeCapability(conRol, "core.instalaciones.list", {})).toMatchObject({
      ok: true,
    });
  });

  it("una excepción que deniega gana; quitarla restituye el permiso del rol", async () => {
    await dato("core.excepciones.set", {
      membershipId,
      permiso: "core:instalaciones.read",
      efecto: "denegar",
      motivo: "monitorea, no necesita el detalle de instalaciones",
    });
    expect(
      await mod.executeCapability(await ctxUsuario(), "core.instalaciones.list", {}),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });

    await dato("core.excepciones.set", {
      membershipId,
      permiso: "core:instalaciones.read",
      efecto: "ninguna",
    });
    expect(
      await mod.executeCapability(await ctxUsuario(), "core.instalaciones.list", {}),
    ).toMatchObject({ ok: true });
  });

  it("la excepción guarda motivo y autor; la lista los devuelve con RLS del tenant", async () => {
    await dato("core.excepciones.set", {
      membershipId,
      permiso: "core:cuentas.read",
      efecto: "conceder",
      motivo: "acceso puntual a cuentas para conciliar",
    });
    const lista = await mod.executeCapability(ctxOwner(), "core.excepciones.list", {
      membershipId,
    });
    expect(lista.ok).toBe(true);
    if (lista.ok) {
      const fila = (lista.data as { permiso: string; motivo: string | null; fijadoPor: unknown }[]).find(
        (e) => e.permiso === "core:cuentas.read",
      );
      expect(fila?.motivo).toBe("acceso puntual a cuentas para conciliar");
    }
    // Otro tenant no ve esta membresía: la RLS devuelve «no encontrado».
    const otro = await e.admin.tenant.create({
      data: { slug: `otro-${randomUUID().slice(0, 8)}`, nombre: "Otro", vertical: "seguridad" },
    });
    const ctxOtro = mod.crearContexto({
      tenantId: otro.id,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });
    const cruzado = await mod.executeCapability(ctxOtro, "core.excepciones.list", { membershipId });
    expect(cruzado).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("no se archiva un rol en uso; las escrituras quedan en la auditoría", async () => {
    const [rol] = await dato<{ id: string }[]>("core.roles.list", {});
    const archivar = await mod.executeCapability(ctxOwner(), "core.roles.archive", { id: rol!.id });
    expect(archivar).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const auditados = await e.admin.auditEvent.findMany({ where: { tenantId } });
    const caps = auditados.map((a) => a.capability);
    expect(caps).toContain("core.roles.create");
    expect(caps).toContain("core.roles.assign");
    expect(caps).toContain("core.excepciones.set");
  });

  it("un rol archivado deniega por defecto; no devuelve al usuario a su rol base", async () => {
    // El usuario tiene rol base viewer (que lee instalaciones) y un rol personalizado asignado. Al
    // archivar ese rol, el borde cae a deny-by-default (lista vacía), nunca al rol base: no lee.
    const [rol] = await dato<{ id: string }[]>("core.roles.list", {});
    await e.admin.rol.update({ where: { id: rol!.id }, data: { archivadoEn: new Date() } });
    expect(
      await mod.executeCapability(await ctxUsuario(), "core.instalaciones.list", {}),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
