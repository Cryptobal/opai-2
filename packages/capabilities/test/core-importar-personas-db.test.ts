// CAR-282 · Importador de personas contra Postgres real: validación por fila, deduplicación por RUT,
// reimportación sin duplicar, previsión y cuenta bancaria (cifrada, nunca reemplazada), permisos por
// sección, aislamiento entre empresas y reversión del lote. Datos sintéticos.
import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { entornoImportar } from "./importar-entorno";

const PERSONAS =
  "Nombres;Apellidos;RUT;Celular;AFP;Salud;Isapre;Banco;Tipo de cuenta;Cuenta bancaria\n" +
  "Ana;Soto;11.111.111-1;+56912345678;Habitat;fonasa;;Banco Estado;Cuenta RUT;11111111\n" +
  "Luis;Rojas;22.222.222-2;;Modelo;isapre;;;;\n" +
  "Eva;Mora;12.345.678-9;;;;;;;\n" +
  "Iván;Paz;76.543.210-3;;;;;Banco Inventado;vista;123456\n" +
  "Sara;Vega;77.777.777-7;;;;;Santander;corriente;\n" +
  "Ana;Repetida;11111111-1;;;;;;;\n" +
  "Tomás;Díaz;33.333.333-3;;;;;;;\n";

type Reversion = { revertido: boolean; aBorrar: number; aRestaurar: number; bloqueadas: { registro: string; motivo: string }[] };

describe.skipIf(!urlPropietario)("core · importador de personas en base real", () => {
  let x: Awaited<ReturnType<typeof entornoImportar>>;
  const previas = { k: process.env["OPAI_SECRETS_KEY"], v: process.env["OPAI_SECRETS_KEY_VERSION"] };
  beforeAll(async () => {
    Object.assign(process.env, { OPAI_SECRETS_KEY: randomBytes(32).toString("base64"), OPAI_SECRETS_KEY_VERSION: "99" });
    x = await entornoImportar();
  });
  afterAll(async () => {
    await x?.e.cerrar();
    for (const [k, v] of [["OPAI_SECRETS_KEY", previas.k], ["OPAI_SECRETS_KEY_VERSION", previas.v]] as const)
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  });
  const personas = (t: string) =>
    x.e.admin.persona.findMany({ where: { tenantId: t }, orderBy: { rut: "asc" }, include: { prevision: true, pago: true } });
  let lote = "";

  it("la simulación valida fila por fila con errores claros y no guarda nada", async () => {
    const s = await x.importar(x.t1, "personas", { archivo: x.csv(PERSONAS) }, true);
    expect(s.mapeo).toMatchObject({ Celular: "telefono", Salud: "sistema_salud", Isapre: "isapre", "Cuenta bancaria": "numero_cuenta" });
    expect(s.conteos).toEqual({ crear: 2, actualizar: 0, sin_cambio: 0, error: 5 });
    const mensaje = (fila: number) => s.filas.find((f) => f.fila === fila)?.mensajes.join(" ") ?? "";
    expect(mensaje(3)).toMatch(/Previsión incompleta/);
    expect(mensaje(4)).toMatch(/RUT inválido/);
    expect(mensaje(5)).toMatch(/No se reconoce el banco «Banco Inventado»/);
    expect(mensaje(6)).toMatch(/Cuenta bancaria incompleta/);
    expect(mensaje(7)).toMatch(/El RUT se repite en la fila 2/);
    expect(await personas(x.t1)).toHaveLength(0);
  });

  it("crea la ficha con previsión y cuenta bancaria; el número queda cifrado y el banco con su código SBIF", async () => {
    const r = await x.importar(x.t1, "personas", { archivo: x.csv(PERSONAS) });
    expect(r.conteos).toEqual({ crear: 2, actualizar: 0, sin_cambio: 0, error: 5 });
    lote = r.importacionId ?? "";
    const [ana, tomas] = await personas(x.t1);
    expect([ana?.nombres, ana?.rut, ana?.telefono, ana?.prevision?.afp, ana?.prevision?.sistemaSalud]).toEqual(["Ana", "11111111-1", "+56912345678", "Habitat", "fonasa"]);
    expect([ana?.pago?.bancoCodigo, ana?.pago?.tipoCuenta]).toEqual(["012", "rut"]);
    expect(ana?.pago?.numeroCuenta).toBeTruthy();
    expect(ana?.pago?.numeroCuenta).not.toContain("11111111");
    expect([tomas?.rut, tomas?.prevision, tomas?.pago]).toEqual(["33333333-3", null, null]);
    const auditoria = JSON.stringify(await x.e.admin.auditEvent.findMany({ where: { tenantId: x.t1, capability: "core.importar.ejecutar" } }));
    expect(auditoria).not.toContain("11111111-1");
    const filasLote = JSON.stringify(await x.e.admin.importacionFila.findMany({ where: { importacionId: lote } }));
    expect(filasLote).not.toContain("Habitat");
  });

  it("reimportar no duplica; completa lo vacío y nunca reemplaza una cuenta bancaria existente", async () => {
    const igual = await x.importar(x.t1, "personas", { archivo: x.csv(PERSONAS) });
    expect(igual.conteos).toMatchObject({ crear: 0, actualizar: 0, sin_cambio: 2 });
    const filas = [
      { nombres: "Ana", apellidos: "Soto", rut: "11.111.111-1", comuna: "Maipú", banco: "Santander", tipo_cuenta: "corriente", numero_cuenta: "999999" },
      { nombres: "Tomás", apellidos: "Díaz", rut: "33.333.333-3", afp: "Capital", banco: "037", tipo_cuenta: "vista", numero_cuenta: "55-5555" },
    ];
    const r = await x.importar(x.t1, "personas", { filas, alExistir: "sobrescribir" });
    expect(r.filas[0]).toMatchObject({ accion: "actualizar", cambios: ["comuna"] });
    expect(r.filas[0]?.mensajes[0]).toMatch(/Ya tiene cuenta bancaria/);
    expect(r.filas[1]?.cambios.sort()).toEqual(["afp", "bancoCodigo", "numeroCuenta", "tipoCuenta"]);
    const [ana, tomas] = await personas(x.t1);
    expect([ana?.comuna, ana?.pago?.bancoCodigo]).toEqual(["Maipú", "012"]);
    expect([tomas?.prevision?.afp, tomas?.pago?.bancoCodigo, tomas?.pago?.tipoCuenta]).toEqual(["Capital", "037", "vista"]);
    expect(await personas(x.t1)).toHaveLength(2);
    // Revertir este lote deja a Tomás sin la previsión ni la cuenta que el lote le cargó.
    const rev = await x.run<Reversion>(x.t1, "core.importar.revertir", { importacionId: r.importacionId ?? "" });
    expect(rev.ok && [rev.data.revertido, rev.data.aRestaurar]).toEqual([true, 2]);
    const [ana2, tomas2] = await personas(x.t1);
    expect([ana2?.comuna, ana2?.pago?.bancoCodigo, tomas2?.prevision?.afp, tomas2?.pago]).toEqual([null, "012", null, null]);
  });

  it("previsión y banco piden su propio permiso; otra empresa no ve estas personas", async () => {
    const fila = { nombres: "Rut", apellidos: "Lagos", rut: "44.444.444-4" };
    const gerente = await x.run<{ filas: { accion: string; mensajes: string[] }[] }>(
      x.t1, "core.importar.ejecutar", { importador: "personas", filas: [{ ...fila, afp: "Modelo" }] }, { rol: "gerente", dryRun: true },
    );
    if (gerente.ok) expect(gerente.data.filas[0]?.mensajes.join(" ")).toMatch(/No tienes permiso para cargar la previsión/);
    else expect(gerente.error.code).toBe("FORBIDDEN");
    expect(await personas(x.t2)).toHaveLength(0);
    const otra = await x.importar(x.t2, "personas", { filas: [{ nombres: "Ana", apellidos: "Soto", rut: "11.111.111-1" }] });
    expect(otra.conteos.crear).toBe(1);
    expect(await personas(x.t1)).toHaveLength(2);
  });

  it("revertir borra lo que el lote creó; un lote con personas modificadas después no se revierte", async () => {
    const viejo = await x.run<Reversion>(x.t1, "core.importar.revertir", { importacionId: lote });
    expect(viejo.ok && [viejo.data.revertido, viejo.data.bloqueadas.map((b) => b.motivo)]).toEqual([
      false,
      ["se modificó después de la importación", "se modificó después de la importación"],
    ]);
    const nuevo = await x.importar(x.t1, "personas", {
      filas: [{ nombres: "Rut", apellidos: "Lagos", rut: "44.444.444-4", afp: "Modelo", banco: "BCI", tipo_cuenta: "ahorro", numero_cuenta: "4444" }],
    });
    expect(await x.e.admin.personaPago.count({ where: { tenantId: x.t1 } })).toBe(2);
    const vista = await x.run<Reversion>(x.t1, "core.importar.revertir", { importacionId: nuevo.importacionId ?? "" }, { dryRun: true });
    expect(vista.ok && [vista.data.aBorrar, vista.data.bloqueadas]).toEqual([1, []]);
    const r = await x.run<Reversion>(x.t1, "core.importar.revertir", { importacionId: nuevo.importacionId ?? "" });
    expect(r.ok && r.data.revertido).toBe(true);
    expect(await personas(x.t1)).toHaveLength(2);
    expect(await x.e.admin.personaPago.count({ where: { tenantId: x.t1 } })).toBe(1);
    expect(await x.e.admin.personaPrevision.count({ where: { tenantId: x.t1, afp: "Modelo" } })).toBe(0);
  });
});
