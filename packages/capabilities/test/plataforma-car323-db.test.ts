// CAR-323 contra Postgres real: lo que Plataforma hace sobre la empresa A no toca a la empresa B.
// Editar A no cambia B; la auditoría filtrada por A no trae filas de B; una invitación de B no se
// revoca ni se reenvía pidiéndola como de A; los miembros de A no incluyen a los de B.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("Plataforma entre empresas (CAR-323)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const s = randomUUID().slice(0, 8);
  const t = { a: "", b: "" };
  let plat = "";
  let invB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    for (const lado of ["a", "b"] as const)
      t[lado] = (
        await e.admin.tenant.create({
          data: { slug: `c323-${lado}-${s}`, nombre: `Empresa ${lado}`, vertical: "seguridad" },
        })
      ).id;
    plat = (
      await e.admin.user.create({
        data: {
          name: "plat",
          email: `plat-${s}@prueba.cl`,
          emailVerified: true,
          platformRole: "owner",
        },
      })
    ).id;
    const miembroB = await e.admin.user.create({
      data: { name: "mb", email: `mb-${s}@prueba.cl` },
    });
    await e.admin.membership.create({
      data: { tenantId: t.b, userId: miembroB.id, rol: "admin", portales: ["erp"] },
    });
    invB = (
      await e.admin.invitation.create({
        data: {
          tenantId: t.b,
          email: `inv-${s}@prueba.cl`,
          rol: "admin",
          portales: ["erp"],
          tokenHash: `h-${s}`,
          invitedByUserId: plat,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = () =>
    mod.crearContexto({
      tenantId: null,
      actor: { tipo: "user", id: plat },
      rol: null,
      portal: "platform",
      portalesMembresia: [],
      usuario: { id: plat, nombre: "plat", email: "plat@prueba.cl", platformRole: "owner" },
      medidor: { registrar: async () => undefined },
    });

  it("editar la empresa A no cambia la B, y la vista previa no escribe", async () => {
    const previa = await mod.executeCapability(
      ctx(),
      "platform.tenants.update",
      { tenantId: t.a, nombre: "Otra A" },
      { dryRun: true },
    );
    expect(previa).toMatchObject({ ok: true, data: { nombre: "Otra A" } });
    expect((await e.admin.tenant.findUniqueOrThrow({ where: { id: t.a } })).nombre).toBe(
      "Empresa a",
    );
    const r = await mod.executeCapability(ctx(), "platform.tenants.update", {
      tenantId: t.a,
      nombre: "Nueva A",
    });
    expect(r).toMatchObject({ ok: true });
    expect((await e.admin.tenant.findUniqueOrThrow({ where: { id: t.a } })).nombre).toBe("Nueva A");
    expect((await e.admin.tenant.findUniqueOrThrow({ where: { id: t.b } })).nombre).toBe(
      "Empresa b",
    );
  });

  it("la auditoría filtrada por A no muestra filas de B", async () => {
    await mod.executeCapability(ctx(), "platform.tenants.update", {
      tenantId: t.b,
      nombre: "Nueva B",
    });
    const r = await mod.executeCapability(ctx(), "platform.auditoria.list", { tenantId: t.a });
    const eventos = r.ok
      ? (r.data as { eventos: { tenantObjetivoId: string | null }[] }).eventos
      : [];
    expect(eventos.length).toBeGreaterThan(0);
    expect(eventos.every((x) => x.tenantObjetivoId === t.a)).toBe(true);
  });

  it("una invitación de B no se revoca ni se reenvía pidiéndola como de A; los miembros de A no traen los de B", async () => {
    for (const cap of ["platform.invitaciones.revocar", "platform.invitaciones.reenviar"])
      expect(
        await mod.executeCapability(ctx(), cap, { tenantId: t.a, invitacionId: invB }),
      ).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" },
      });
    expect(
      (await e.admin.invitation.findUniqueOrThrow({ where: { id: invB } })).revocadaEn,
    ).toBeNull();
    const m = await mod.executeCapability(ctx(), "platform.tenants.miembros", { tenantId: t.a });
    expect(m).toMatchObject({ ok: true, data: { miembros: [], invitaciones: [] } });
    const ok = await mod.executeCapability(ctx(), "platform.invitaciones.revocar", {
      tenantId: t.b,
      invitacionId: invB,
    });
    expect(ok).toMatchObject({ ok: true, data: { revocada: true } });
  });
});
