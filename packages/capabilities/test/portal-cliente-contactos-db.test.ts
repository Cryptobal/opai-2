// CAR-218 · acceso al Portal Cliente por contacto de la cuenta, contra Postgres real (si hay
// DATABASE_URL_TEST). Los contactos no son usuarios del ERP: se listan con el estado de su acceso y se
// les da acceso desde la cuenta. Nunca se envía un correo real: lo único que se invita va en dryRun.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Fila = { contactoId: string; estado: string; accesoId: string | null; motivo?: string };

describe.skipIf(!urlPropietario)("Portal Cliente · acceso por contacto en base real", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tA = "";
  let tB = "";
  let cuenta = "";
  const c: Record<string, string> = {};
  const sufijo = randomUUID().slice(0, 8);
  const correo = (n: string) => `${n}-${sufijo}@prueba.cl`;
  const medidor = { registrar: async () => undefined };

  const ctx = (tenantId: string, rol: "owner" | "viewer" = "owner") =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol,
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["portal_cliente"],
      medidor,
    });
  // La invitación de un contacto exige un usuario responsable (no el actor de sistema).
  const responsable = randomUUID();
  const ctxResponsable = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: responsable },
      usuario: { id: responsable, nombre: "Admin", email: correo("admin"), platformRole: null },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["portal_cliente"],
      medidor,
    });
  const run = (t: string, id: string, input: unknown, o = {}, rol: "owner" | "viewer" = "owner") =>
    mod.executeCapability(ctx(t, rol), id, input, o);
  async function dato<T>(id: string, input: unknown, o = {}) {
    const r = await run(tA, id, input, o);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const listar = async () =>
    await dato<Fila[]>("portal_cliente.contactos.listar", { cuentaId: cuenta });
  const de = (filas: Fila[], n: string) => filas.find((f) => f.contactoId === c[n]);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPortalCliente]);
    const tenant = async (slug: string) =>
      (
        await e.admin.tenant.create({
          data: { slug: `${slug}-${sufijo}`, nombre: slug, vertical: "seguridad" },
        })
      ).id;
    tA = await tenant("pcc-a");
    tB = await tenant("pcc-b");
    cuenta = (
      await e.admin.cuenta.create({ data: { tenantId: tA, nombre: "Logística Andina SpA" } })
    ).id;
    const contacto = async (n: string, extra: Record<string, unknown> = {}) => {
      c[n] = (
        await e.admin.contacto.create({
          data: {
            tenantId: tA,
            cuentaId: cuenta,
            nombres: n,
            apellidos: "Prueba",
            email: correo(n),
            ...extra,
          },
        })
      ).id;
    };
    await contacto("ana", { esPrincipal: true });
    await contacto("beto");
    await contacto("carla", { email: null });
    await contacto("dani", { archivadoEn: new Date() });
    await contacto("eva");
    await contacto("fede");
    const usuario = async (n: string, portales: string[]) => {
      const userId = randomUUID();
      await e.admin.user.create({ data: { id: userId, name: n, email: correo(n) } });
      await e.admin.membership.create({ data: { tenantId: tA, userId, rol: "viewer", portales } });
    };
    await usuario("ana", ["cliente"]);
    await usuario("beto", ["cliente"]);
    await usuario("eva", ["erp"]);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("lista los contactos vigentes con el estado de su acceso", async () => {
    const filas = await listar();
    expect(de(filas, "dani")).toBeUndefined();
    expect(filas[0]?.contactoId).toBe(c["ana"]);
    expect(de(filas, "ana")?.estado).toBe("sin_acceso");
    expect(de(filas, "beto")?.estado).toBe("sin_acceso");
    expect(de(filas, "carla")?.estado).toBe("sin_correo");
    expect(de(filas, "eva")).toMatchObject({ estado: "no_disponible", motivo: "usuario_interno" });
    expect(de(filas, "fede")?.estado).toBe("sin_acceso");
  });

  it("dar acceso en vista previa no escribe ni invita", async () => {
    const inv = await mod.executeCapability(
      ctxResponsable(tA),
      "portal_cliente.contactos.dar_acceso",
      { cuentaId: cuenta, contactoId: c["fede"] },
      { dryRun: true },
    );
    expect(inv.ok && inv.data).toMatchObject({ estado: "invitado" });
    expect(await e.admin.invitation.count({ where: { email: correo("fede") } })).toBe(0);
    const v = await dato<{ estado: string }>(
      "portal_cliente.contactos.dar_acceso",
      { cuentaId: cuenta, contactoId: c["beto"] },
      { dryRun: true },
    );
    expect(v.estado).toBe("vinculado");
    expect(await e.admin.accesoCliente.count({ where: { tenantId: tA } })).toBe(0);
  });

  it("vincula al contacto que ya tiene usuario de cliente y es idempotente", async () => {
    const r = await dato<{ estado: string }>("portal_cliente.contactos.dar_acceso", {
      cuentaId: cuenta,
      contactoId: c["beto"],
    });
    expect(r.estado).toBe("vinculado");
    const again = await dato<{ estado: string }>("portal_cliente.contactos.dar_acceso", {
      cuentaId: cuenta,
      contactoId: c["beto"],
    });
    expect(again.estado).toBe("ya_tiene_acceso");
    const beto = de(await listar(), "beto");
    expect(beto?.estado).toBe("activo");
    expect(beto?.accesoId).toBeTruthy();
    const fila = await e.admin.accesoCliente.findUnique({ where: { id: beto?.accesoId ?? "" } });
    expect(fila).toMatchObject({ contactoId: c["beto"], todasInstalaciones: false });
  });

  it("suspender y revocar se ven en el listado y no se reactivan al dar acceso", async () => {
    const id = de(await listar(), "beto")?.accesoId ?? "";
    await dato("portal_cliente.accesos.actualizar", { accesoId: id, estado: "suspendido" });
    expect(de(await listar(), "beto")?.estado).toBe("suspendido");
    const r = await dato<{ estado: string; motivo?: string }>(
      "portal_cliente.contactos.dar_acceso",
      { cuentaId: cuenta, contactoId: c["beto"] },
    );
    expect(r).toMatchObject({ estado: "no_aplica", motivo: "acceso_suspendido" });
    await dato("portal_cliente.accesos.actualizar", { accesoId: id, estado: "revocado" });
    expect(de(await listar(), "beto")?.estado).toBe("revocado");
  });

  it("no da acceso a contactos sin correo o internos, ni a uno de otra cuenta", async () => {
    const sinCorreo = await dato<{ estado: string; motivo?: string }>(
      "portal_cliente.contactos.dar_acceso",
      { cuentaId: cuenta, contactoId: c["carla"] },
    );
    expect(sinCorreo).toMatchObject({ estado: "no_aplica", motivo: "correo_invalido" });
    const interno = await dato<{ estado: string; motivo?: string }>(
      "portal_cliente.contactos.dar_acceso",
      { cuentaId: cuenta, contactoId: c["eva"] },
    );
    expect(interno).toMatchObject({ estado: "no_aplica", motivo: "usuario_interno" });
    const otra = (await e.admin.cuenta.create({ data: { tenantId: tA, nombre: "Otra cuenta" } }))
      .id;
    const ajeno = await dato<{ estado: string; motivo?: string }>(
      "portal_cliente.contactos.dar_acceso",
      { cuentaId: otra, contactoId: c["ana"] },
    );
    expect(ajeno).toMatchObject({ estado: "no_aplica", motivo: "contacto_no_vigente" });
  });

  it("otra empresa no ve la cuenta y quien solo puede leer no da acceso", async () => {
    const otra = await run(tB, "portal_cliente.contactos.listar", { cuentaId: cuenta });
    expect(otra.ok).toBe(false);
    const dar = await run(tB, "portal_cliente.contactos.dar_acceso", {
      cuentaId: cuenta,
      contactoId: c["ana"],
    });
    expect(dar.ok).toBe(false);
    const viewer = await run(
      tA,
      "portal_cliente.contactos.dar_acceso",
      { cuentaId: cuenta, contactoId: c["ana"] },
      {},
      "viewer",
    );
    expect(viewer.ok).toBe(false);
    expect(de(await listar(), "ana")?.estado).toBe("sin_acceso");
  });
});
