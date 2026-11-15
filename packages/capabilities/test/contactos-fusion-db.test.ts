import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { FK_CONTACTOS_MOVIDAS } from "../src/core/maestros/contactos-fusion-sql";
import { codigo, dato } from "./maestros-ayuda";

type Fusion = { mueve: Record<string, number>; comparacion: { campo: string; queda: string }[]; aplicada: boolean };

// Fusión de contactos (CAR-27, F3) contra Postgres real sin BYPASSRLS. Datos ficticios.
describe("core · fusionar contactos contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let userId = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["comercial"],
    });
  const cuenta = (nombre: string) =>
    e.admin.cuenta.create({ data: { tenantId: a, nombre } }).then((c) => c.id);
  const contacto = (cuentaId: string, nombres: string, email: string | undefined, esPrincipal: boolean, extra = {}) =>
    dato<{ id: string }>(ctx(a), "core.contactos.create", { cuentaId, nombres, apellidos: "Prueba", ...(email ? { email } : {}), esPrincipal, ...extra });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    a = (await nuevo(`fusionc-a-${sufijo}`)).id;
    b = (await nuevo(`fusionc-b-${sufijo}`)).id;
    userId = (
      await e.admin.user.create({ data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true } })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("el inventario de la fusión cubre toda FK hacia core.contactos", async () => {
    const filas = await e.admin.$queryRawUnsafe<{ t: string }[]>(
      `SELECT DISTINCT c.conrelid::regclass::text AS t FROM pg_constraint c
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.contype = 'f' AND c.confrelid = 'core.contactos'::regclass AND a.attname <> 'tenant_id'`,
    );
    expect(filas.map((f) => f.t).sort()).toEqual([...FK_CONTACTOS_MOVIDAS].sort());
  });

  it("vista previa sin escribir; fusión en la misma cuenta hereda el principal y el correo", async () => {
    const c1 = await cuenta("Gamma");
    const c2 = await cuenta("Delta");
    const queda = await contacto(c1, "Pía", undefined, false, { telefono: "+56 9 1111 1111" });
    const dup = await contacto(c1, "Pia", `pia-${sufijo}@gamma.test`, true);
    await dato(ctx(a), "core.contactos.vincular", { contactoId: dup.id, cuentaId: c2, roles: [] });
    const entrada = { contactoId: queda.id, duplicadoId: dup.id };

    const previa = await dato<Fusion>(ctx(a), "core.contactos.fusionar", entrada, { dryRun: true });
    expect(previa.aplicada).toBe(false);
    expect(previa.mueve).toMatchObject({ cuentas: 2 });
    expect(previa.comparacion.find((c) => c.campo === "email")?.queda).toBe("duplicado");
    expect(await e.admin.contacto.count({ where: { id: dup.id } })).toBe(1);

    expect((await dato<Fusion>(ctx(a), "core.contactos.fusionar", entrada)).aplicada).toBe(true);
    expect(await e.admin.contacto.count({ where: { id: dup.id } })).toBe(0);
    const final = await e.admin.contacto.findUniqueOrThrow({ where: { id: queda.id } });
    expect([final.nombres, final.email, final.telefono]).toEqual(["Pía", `pia-${sufijo}@gamma.test`, "+56911111111"]);
    const vinculos = await e.admin.contactoCuenta.findMany({ where: { contactoId: queda.id } });
    expect(vinculos.map((v) => v.cuentaId).sort()).toEqual([c1, c2].sort());
    expect(vinculos.find((v) => v.cuentaId === c1)?.esPrincipal).toBe(true);
  });

  it("bloquea el mismo contacto y otra empresa", async () => {
    const c = await cuenta("Épsilon");
    const x = await contacto(c, "Uno", undefined, false);
    const y = await contacto(c, "Dos", undefined, false);
    expect(await codigo(ctx(a), "core.contactos.fusionar", { contactoId: x.id, duplicadoId: x.id }, { dryRun: true })).toBe("UNPROCESSABLE");
    expect(await codigo(ctx(b), "core.contactos.fusionar", { contactoId: x.id, duplicadoId: y.id }, { dryRun: true })).toBe("NOT_FOUND");
  });
});
