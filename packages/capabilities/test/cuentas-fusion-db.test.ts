import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { FK_CUENTAS_MOVIDAS } from "../src/core/maestros/cuentas-fusion-sql";
import { codigo, dato } from "./maestros-ayuda";

type Fusion = { mueve: Record<string, number>; comparacion: { campo: string; queda: string }[]; aplicada: boolean };

// Fusión de cuentas (CAR-27, BRIEF-CAR-27-fusionar) contra Postgres real sin BYPASSRLS. Datos ficticios.
describe("core · fusionar cuentas contra Postgres real", () => {
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
  const cuenta = (nombre: string, extra = {}) =>
    e.admin.cuenta.create({ data: { tenantId: a, nombre, ...extra } }).then((c) => c.id);
  const contacto = (cuentaId: string, nombres: string, email: string, esPrincipal: boolean) =>
    dato<{ id: string }>(ctx(a), "core.contactos.create", { cuentaId, nombres, apellidos: "Prueba", email, esPrincipal });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    a = (await nuevo(`fusion-a-${sufijo}`)).id;
    b = (await nuevo(`fusion-b-${sufijo}`)).id;
    await sembrarComercial(e.admin.$extends({}), a);
    userId = (
      await e.admin.user.create({
        data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({ data: { tenantId: a, userId, rol: "owner", portales: ["erp"] } });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("el inventario de la fusión cubre toda FK hacia core.cuentas", async () => {
    const filas = await e.admin.$queryRawUnsafe<{ t: string }[]>(
      `SELECT DISTINCT c.conrelid::regclass::text AS t FROM pg_constraint c
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.contype = 'f' AND c.confrelid = 'core.cuentas'::regclass AND a.attname <> 'tenant_id'`,
    );
    expect(filas.map((f) => f.t).sort()).toEqual([...FK_CUENTAS_MOVIDAS].sort());
  });

  it("vista previa sin escribir, fusión con choques resueltos y borrado del duplicado", async () => {
    const queda = await cuenta("Clínica Alfa S.A.", { giro: "Salud" });
    const dup = await cuenta("Clinica Alfa", { sitioWeb: "alfa.test", rut: "76000001-1" });
    await contacto(queda, "Pía", `pia-${sufijo}@alfa.test`, true);
    const movido = await contacto(dup, "Leo", `leo-${sufijo}@alfa.test`, true);
    const et = await dato<{ id: string }>(ctx(a), "core.etiquetas.create", { nombre: `Salud ${sufijo}` });
    await dato(ctx(a), "core.etiquetas.asignar", { entidadTipo: "cuenta", entidadIds: [queda, dup], etiquetaIds: [et.id] });
    await e.admin.instalacion.create({ data: { tenantId: a, cuentaId: queda, nombre: "Casa matriz", estado: "prospecto" } });
    await e.admin.instalacion.create({ data: { tenantId: a, cuentaId: dup, nombre: "Casa matriz", estado: "prospecto" } });
    const etapa = await e.admin.etapa.findFirstOrThrow({ where: { tenantId: a, tipo: "abierta" } });
    await e.admin.negocio.create({ data: { tenantId: a, cuentaId: dup, embudoId: etapa.embudoId, etapaId: etapa.id, titulo: "N", responsableId: userId, valorMensual: 0 } });

    const entrada = { cuentaId: queda, duplicadoId: dup, elegir: { rut: "duplicado" } };
    const previa = await dato<Fusion>(ctx(a), "core.cuentas.fusionar", entrada, { dryRun: true });
    expect(previa.aplicada).toBe(false);
    expect(previa.mueve).toMatchObject({ contactos: 1, instalaciones: 1, negocios: 1 });
    expect(previa.comparacion.find((c) => c.campo === "sitioWeb")?.queda).toBe("duplicado");
    expect(await e.admin.cuenta.count({ where: { id: dup } })).toBe(1);

    expect((await dato<Fusion>(ctx(a), "core.cuentas.fusionar", entrada)).aplicada).toBe(true);
    expect(await e.admin.cuenta.count({ where: { id: dup } })).toBe(0);
    const final = await e.admin.cuenta.findUniqueOrThrow({ where: { id: queda } });
    expect([final.nombre, final.rut, final.sitioWeb, final.giro]).toEqual(["Clínica Alfa S.A.", "76000001-1", "alfa.test", "Salud"]);
    const vinculos = await e.admin.contactoCuenta.findMany({ where: { cuentaId: queda } });
    expect(vinculos).toHaveLength(2);
    expect(vinculos.filter((v) => v.esPrincipal)).toHaveLength(1);
    expect(vinculos.find((v) => v.contactoId === movido.id)?.esPrincipal).toBe(false);
    expect(await e.admin.etiquetaAsignacion.count({ where: { cuentaId: queda } })).toBe(1);
    const nombres = (await e.admin.instalacion.findMany({ where: { cuentaId: queda } })).map((i) => i.nombre).sort();
    expect(nombres).toEqual(["Casa matriz", "Casa matriz (fusionada)"]);
    expect(await e.admin.negocio.count({ where: { cuentaId: queda } })).toBe(1);
  });

  it("bloquea correos repetidos, la misma cuenta y otra empresa", async () => {
    const x = await cuenta("Beta");
    const y = await cuenta("Beta Ltda");
    await contacto(x, "Uno", `uno-${sufijo}@beta.test`, false);
    await contacto(y, "Uno bis", `uno-${sufijo}@beta.test`, false);
    expect(await codigo(ctx(a), "core.cuentas.fusionar", { cuentaId: x, duplicadoId: y }, { dryRun: true })).toBe("UNPROCESSABLE");
    expect(await codigo(ctx(a), "core.cuentas.fusionar", { cuentaId: x, duplicadoId: x }, { dryRun: true })).toBe("UNPROCESSABLE");
    expect(await codigo(ctx(b), "core.cuentas.fusionar", { cuentaId: x, duplicadoId: y }, { dryRun: true })).toBe("NOT_FOUND");
  });
});
