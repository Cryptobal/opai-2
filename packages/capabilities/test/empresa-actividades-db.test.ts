// CAR-243 contra Postgres real: el ACTECO vive en la configuración principal de la empresa (`core.perfil_empresa`),
// con varios códigos y uno principal. La emisión DTE y `finanzas.dte_config.*` leen ese mismo dato; RLS por empresa,
// CHECK de la base, vista previa sin escribir y auditoría de la escritura real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { datosEmisorSimpleApi } from "../src/finanzas/adaptador-sii";

type Actividades = { principal: number | null; actividades: { codigo: number; codigoSii: string; glosa: string | null; principal: boolean }[] };

describe.skipIf(!urlPropietario)("ACTECO de la empresa (CAR-243, base real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let a = "";
  let b = "";
  const usuarioId = randomUUID();

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
    const tenant = (slug: string) => e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    a = (await tenant(`acteco-a-${randomUUID().slice(0, 8)}`)).id;
    b = (await tenant(`acteco-b-${randomUUID().slice(0, 8)}`)).id;
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin de prueba", email: "admin@prueba.cl", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const ejecutar = (tenantId: string, id: string, input: object, dryRun = false) =>
    mod.executeCapability(ctx(tenantId), id, input, { dryRun });
  const dato = async <T>(tenantId: string, id: string, input: object, dryRun = false) => {
    const r = await ejecutar(tenantId, id, input, dryRun);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };

  it("sin datos: lista vacía y sin principal", async () => {
    expect(await dato<Actividades>(a, "core.empresa.acteco_get", {})).toEqual({ principal: null, actividades: [] });
  });

  it("la vista previa no escribe; la escritura real deja el principal primero, con glosa del catálogo, y queda auditada", async () => {
    const input = { codigos: [829900, 123456, 801001], principal: 801001 };
    const previa = await dato<Actividades>(a, "core.empresa.acteco_set", input, true);
    expect(previa.principal).toBe(801001);
    expect(await e.admin.perfilEmpresa.count({ where: { tenantId: a } })).toBe(0);
    const r = await dato<Actividades>(a, "core.empresa.acteco_set", input);
    expect(r).toEqual(previa);
    expect(r.actividades.map((x) => [x.codigoSii, x.principal])).toEqual([
      ["801001", true],
      ["829900", false],
      ["123456", false],
    ]);
    expect(r.actividades[0]?.glosa).toBe("SERVICIOS DE SEGURIDAD PRIVADA PRESTADOS POR EMPRESAS");
    // Un código escrito a mano que no está en el catálogo se acepta, sin glosa.
    expect(r.actividades[2]?.glosa).toBeNull();
    expect(await dato(a, "core.empresa.acteco_get", {})).toEqual(r);
    const auditoria = await e.admin.auditEvent.count({ where: { tenantId: a, capability: "core.empresa.acteco_set" } });
    expect(auditoria).toBe(1);
  });

  it("rechaza un principal que no está en la lista, sin escribir", async () => {
    const r = await ejecutar(a, "core.empresa.acteco_set", { codigos: [829900], principal: 801001 });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect((await e.admin.perfilEmpresa.findUniqueOrThrow({ where: { tenantId: a } })).actecoPrincipal).toBe(801001);
  });

  it("la base rechaza por su cuenta un principal fuera de la lista o una lista sin principal (CHECK)", async () => {
    await expect(
      e.admin.perfilEmpresa.create({ data: { tenantId: b, actecos: [801001], actecoPrincipal: 829900 } }),
    ).rejects.toThrow(/perfil_empresa_actecos_chk/);
    await expect(e.admin.perfilEmpresa.create({ data: { tenantId: b, actecos: [801001] } })).rejects.toThrow(
      /perfil_empresa_actecos_chk/,
    );
    await expect(
      e.admin.perfilEmpresa.create({ data: { tenantId: b, actecos: [0], actecoPrincipal: 0 } }),
    ).rejects.toThrow(/perfil_empresa_actecos_chk/);
  });

  it("otra empresa no ve el ACTECO de la primera (RLS)", async () => {
    expect(await dato<Actividades>(b, "core.empresa.acteco_get", {})).toEqual({ principal: null, actividades: [] });
  });

  it("la emisión DTE y la configuración DTE toman el principal de la empresa", async () => {
    expect((await datosEmisorSimpleApi(ctx(a))).actecoEmisor).toBe(801001);
    expect((await datosEmisorSimpleApi(ctx(b))).actecoEmisor).toBeUndefined();
    const cfg = await dato<{ acteco: number | null }>(a, "finanzas.dte_config.obtener", {});
    expect(cfg.acteco).toBe(801001);
  });

  it("`finanzas.dte_config.actualizar` con acteco cambia el principal de la empresa sin perder los otros códigos", async () => {
    const r = await dato<{ acteco: number | null }>(a, "finanzas.dte_config.actualizar", { ambiente: "certificacion", acteco: 829900 });
    expect(r.acteco).toBe(829900);
    const act = await dato<Actividades>(a, "core.empresa.acteco_get", {});
    expect(act.principal).toBe(829900);
    expect(act.actividades.map((x) => x.codigo)).toEqual([829900, 801001, 123456]);
    // Con varios códigos, quitar el principal desde la configuración DTE pide elegir otro en Configuración › Empresa.
    const quitar = await ejecutar(a, "finanzas.dte_config.actualizar", { ambiente: "certificacion", acteco: null });
    expect(quitar).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect((await datosEmisorSimpleApi(ctx(a))).actecoEmisor).toBe(829900);
    // Sin `acteco` en el input, la configuración DTE no toca el ACTECO de la empresa.
    await dato(a, "finanzas.dte_config.actualizar", { ambiente: "certificacion", umbralFoliosPct: 30 });
    expect((await dato<Actividades>(a, "core.empresa.acteco_get", {})).principal).toBe(829900);
  });

  it("con un solo código, acteco null desde la configuración DTE lo quita; lista vacía también vale en la capacidad", async () => {
    await dato(b, "finanzas.dte_config.actualizar", { ambiente: "certificacion", acteco: 801001 });
    expect((await dato<Actividades>(b, "core.empresa.acteco_get", {})).principal).toBe(801001);
    await dato(b, "finanzas.dte_config.actualizar", { ambiente: "certificacion", acteco: null });
    expect(await dato(b, "core.empresa.acteco_get", {})).toEqual({ principal: null, actividades: [] });
    await dato(a, "core.empresa.acteco_set", { codigos: [], principal: null });
    expect((await dato<Actividades>(a, "core.empresa.acteco_get", {})).actividades).toEqual([]);
  });

  it("el catálogo se busca por código o por palabras", async () => {
    const r = await dato<{ items: { codigo: number; codigoSii: string }[] }>(a, "core.empresa.acteco_buscar", {
      q: "seguridad privada",
    });
    expect(r.items.map((x) => x.codigoSii)).toEqual(expect.arrayContaining(["801001", "801003"]));
    const porCodigo = await dato<{ items: { codigo: number }[] }>(a, "core.empresa.acteco_buscar", { q: "829900" });
    expect(porCodigo.items[0]?.codigo).toBe(829900);
  });
});
