// CAR-803 · acceso automático al portal del trabajador. Dos tenants, RLS real. Sin correos reales.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("Portal trabajador · acceso automático en base real", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tA = "";
  let tB = "";
  const personas: Record<string, string> = {};
  const usuarios: Record<string, string> = {};
  const sufijo = randomUUID().slice(0, 8);
  const correo = (n: string) => `${n}-${sufijo}@prueba.cl`;
  const medidor = { registrar: async () => undefined };
  const adminId = randomUUID();

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: adminId },
      usuario: { id: adminId, nombre: "Admin", email: correo("admin"), platformRole: null },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["portal_trabajador"],
      medidor,
      servicios: {
        urlBase: "https://test.opai.cl",
        correo: { nombre: "memoria", enviar: async () => undefined },
      },
    });
  const run = (t: string, id: string, input: unknown, o: Record<string, unknown> = {}) =>
    mod.executeCapability(ctx(t), id, input, o);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const tenant = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug: `${slug}-${sufijo}`, nombre: slug, vertical: "seguridad" } }))
        .id;
    tA = await tenant("ppt-a");
    tB = await tenant("ppt-b");
    await e.admin.user.create({ data: { id: adminId, name: "Admin", email: correo("admin") } });
    await e.admin.membership.create({
      data: { tenantId: tA, userId: adminId, rol: "owner", portales: ["erp"], estado: "activa" },
    });
    const persona = async (t: string, n: string, extra: Record<string, unknown> = {}) => {
      const id = (
        await e.admin.persona.create({
          data: {
            tenantId: t,
            rut: `${n.slice(0, 8)}-${Math.floor(Math.random() * 9)}`,
            nombres: n,
            apellidos: "Prueba",
            estado: "activo",
            emailLaboral: correo(n),
            ...extra,
          },
        })
      ).id;
      personas[`${t}-${n}`] = id;
      return id;
    };
    await persona(tA, "ana");
    await persona(tA, "bruno", { emailLaboral: null, emailPersonal: null });
    await persona(tB, "caro");
    const usuario = async (n: string, portales: string[], rol = "viewer") => {
      const userId = randomUUID();
      usuarios[n] = userId;
      await e.admin.user.create({ data: { id: userId, name: n, email: correo(n) } });
      await e.admin.membership.create({ data: { tenantId: tA, userId, rol, portales, estado: "activa" } });
    };
    await usuario("diana", ["trabajador"]);
    await usuario("owner", ["erp", "trabajador"], "owner");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("estado sin correo y dar acceso en dryRun no escribe", async () => {
    const r = await run(tA, "core.personas.acceso_estado", { personaId: personas[`${tA}-bruno`]! });
    expect(r).toMatchObject({ ok: true, data: { estado: "sin_correo" } });
    const antes = await e.admin.invitation.count();
    const d = await run(tA, "core.personas.dar_acceso_portal", { personaId: personas[`${tA}-ana`]! }, { dryRun: true });
    expect(d).toMatchObject({ ok: true, data: { estado: "invitado" } });
    expect(await e.admin.invitation.count()).toBe(antes);
  });

  it("otro tenant no lee el estado de una persona ajena", async () => {
    const r = await run(tB, "core.personas.acceso_estado", { personaId: personas[`${tA}-ana`]! });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("vincular usuario rechaza al owner y enlaza trabajador viewer", async () => {
    const id = personas[`${tA}-ana`]!;
    const malo = await run(tA, "core.personas.vincular_usuario", { id, usuarioId: usuarios["owner"]! });
    expect(malo).toMatchObject({ ok: false });
    const bien = await run(tA, "core.personas.vincular_usuario", { id, usuarioId: usuarios["diana"]! });
    expect(bien.ok).toBe(true);
    const estado = await run(tA, "core.personas.acceso_estado", { personaId: id });
    expect(estado).toMatchObject({ ok: true, data: { estado: "activo" } });
  });

  it("dar acceso es idempotente con invitación pendiente", async () => {
    const id = (
      await e.admin.persona.create({
        data: {
          tenantId: tA,
          rut: `99${sufijo.slice(0, 6)}-K`,
          nombres: "Eva",
          apellidos: "Prueba",
          estado: "activo",
          emailLaboral: correo("eva"),
        },
      })
    ).id;
    const uno = await run(tA, "core.personas.dar_acceso_portal", { personaId: id });
    expect(uno).toMatchObject({ ok: true, data: { estado: "invitado" } });
    const dos = await run(tA, "core.personas.dar_acceso_portal", { personaId: id });
    expect(dos).toMatchObject({ ok: true, data: { estado: "invitacion_pendiente" } });
  });
});