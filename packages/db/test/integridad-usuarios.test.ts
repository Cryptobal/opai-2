// CAR-45 y CAR-46 (B), migración 20261028234500: borrar un usuario con membresías falla (RESTRICT),
// la baja es por estado y conserva excepciones y alcance; las referencias a usuario exigen que sea
// miembro de la empresa (trigger usuario_miembro), salvo el invitador de plataforma.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

// Prisma traduce el 23503 del trigger a su error de FK; el texto propio se prueba con SQL directo.
const NO_MIEMBRO = /Foreign key constraint violated/;

describe.skipIf(!urlPropietario)("integridad de usuarios (CAR-45, CAR-46)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let a = "";
  let b = "";
  let miembro = "";
  let deB = "";
  let plataforma = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const tenant = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } })).id;
    a = await tenant(`int-a-${sufijo}`);
    b = await tenant(`int-b-${sufijo}`);
    const usuario = async (n: string, platformRole?: string) =>
      (
        await e.admin.user.create({
          data: {
            name: n,
            email: `${n}-${sufijo}@test.opai.cl`,
            platformRole: platformRole ?? null,
          },
        })
      ).id;
    miembro = await usuario("miembro");
    deB = await usuario("deb");
    plataforma = await usuario("plat", "owner");
    await e.admin.membership.createMany({
      data: [
        { tenantId: a, userId: miembro, rol: "supervisor", portales: ["erp"] },
        { tenantId: b, userId: miembro, rol: "viewer", portales: ["erp"] },
        { tenantId: b, userId: deB, rol: "admin", portales: ["erp"] },
      ],
    });
  });

  afterAll(async () => {
    if (!e) return;
    const tenants = { tenantId: { in: [a, b] } };
    await e.admin.invitation.deleteMany({ where: tenants });
    await e.admin.notificacion.deleteMany({ where: tenants });
    await e.admin.persona.deleteMany({ where: tenants });
    await e.admin.ajuste.deleteMany({ where: tenants });
    await e.admin.permisoExcepcion.deleteMany({ where: tenants });
    await e.admin.membership.deleteMany({ where: tenants });
    await e.admin.user.deleteMany({ where: { id: { in: [miembro, deB, plataforma] } } });
    await e.admin.tenant.deleteMany({ where: { id: { in: [a, b] } } });
    await e.cerrar();
  });

  it("borrar un usuario con membresías falla, incluso con el rol propietario", async () => {
    await expect(e.admin.user.delete({ where: { id: miembro } })).rejects.toThrow();
    expect(await e.admin.membership.count({ where: { userId: miembro } })).toBe(2);
    // Un usuario sin membresías se sigue pudiendo borrar (limpiezas de pruebas de auth).
    const suelto = await e.admin.user.create({
      data: { name: "suelto", email: `suelto-${sufijo}@test.opai.cl` },
    });
    await expect(e.admin.user.delete({ where: { id: suelto.id } })).resolves.toBeTruthy();
  });

  it("la baja por estado suspende la membresía y conserva sus excepciones", async () => {
    const m = await e.forTenant(a).membership.findFirstOrThrow({ where: { userId: miembro } });
    await e.forTenant(a).permisoExcepcion.create({
      data: { tenantId: a, membershipId: m.id, permiso: "core:personas.read", conceder: true },
    });
    await e.forTenant(a).membership.update({ where: { id: m.id }, data: { estado: "suspendida" } });
    const despues = await e.forTenant(a).membership.findUniqueOrThrow({ where: { id: m.id } });
    expect(despues.estado).toBe("suspendida");
    expect(await e.forTenant(a).permisoExcepcion.count({ where: { membershipId: m.id } })).toBe(1);
    // La membresía suspendida sigue siendo miembro para las referencias históricas.
    await expect(
      e.forTenant(a).ajuste.create({
        data: {
          tenantId: a,
          ambito: "usuario",
          sujetoId: miembro,
          modulo: "core",
          clave: "x",
          valor: true,
        },
      }),
    ).resolves.toBeTruthy();
  });

  it("una persona de A no se puede ligar a un usuario que solo es miembro de B", async () => {
    const persona = (usuarioId: string, rut: string) =>
      e.forTenant(a).persona.create({
        data: { tenantId: a, nombres: "P", apellidos: "Q", rut, usuarioId },
      });
    await expect(persona(deB, "11111111-1")).rejects.toThrow(NO_MIEMBRO);
    const p = await persona(miembro, "22222222-2");
    await expect(
      e.forTenant(a).persona.update({ where: { id: p.id }, data: { usuarioId: deB } }),
    ).rejects.toThrow(NO_MIEMBRO);
  });

  it("una fila histórica se sigue editando aunque su usuario ya no sea miembro", async () => {
    const p = await e.forTenant(b).persona.create({
      data: { tenantId: b, nombres: "H", apellidos: "I", rut: "33333333-3", usuarioId: deB },
    });
    await e.admin.membership.deleteMany({ where: { tenantId: b, userId: deB } });
    await expect(
      e.forTenant(b).persona.update({ where: { id: p.id }, data: { nombres: "Editada" } }),
    ).resolves.toMatchObject({ nombres: "Editada", usuarioId: deB });
  });

  it("ajustes: sujeto usuario exige membresía; sujeto tenant no se verifica", async () => {
    const ajuste = (ambito: string, sujetoId: string) =>
      e.forTenant(a).ajuste.create({
        data: { tenantId: a, ambito, sujetoId, modulo: "core", clave: `k-${ambito}`, valor: 1 },
      });
    await expect(ajuste("usuario", deB)).rejects.toThrow(NO_MIEMBRO);
    await expect(ajuste("tenant", a)).resolves.toBeTruthy();
  });

  it("invitaciones: el invitador debe ser miembro o de plataforma", async () => {
    const invitar = (invitedByUserId: string) =>
      e.forTenant(a).invitation.create({
        data: {
          tenantId: a,
          email: `inv-${randomUUID().slice(0, 6)}@test.opai.cl`,
          rol: "viewer",
          portales: ["erp"],
          tokenHash: randomUUID(),
          invitedByUserId,
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
    await expect(invitar(deB)).rejects.toThrow(NO_MIEMBRO);
    await expect(invitar(plataforma)).resolves.toBeTruthy();
    await expect(invitar(miembro)).resolves.toBeTruthy();
  });

  it("notificaciones: el destinatario debe ser miembro de la empresa", async () => {
    const avisar = (usuarioId: string) =>
      e.forTenant(a).notificacion.create({ data: { tenantId: a, usuarioId, titulo: "Aviso" } });
    await expect(avisar(deB)).rejects.toThrow(NO_MIEMBRO);
    await expect(avisar(miembro)).resolves.toBeTruthy();
    await expect(
      e.admin.$executeRawUnsafe(
        `INSERT INTO core.notificaciones (id, tenant_id, usuario_id, titulo) VALUES ($1::uuid, $2::uuid, $3::uuid, 'x')`,
        randomUUID(),
        a,
        deB,
      ),
    ).rejects.toThrow(
      /notificaciones\.usuario_id apunta a un usuario que no es miembro de la empresa/,
    );
  });
});
