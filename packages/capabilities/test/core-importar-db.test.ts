// CAR-279 · Motor de importación contra Postgres real: simulación, validación por fila, deduplicación por
// RUT, reimportación sin duplicar, políticas al existir, aislamiento entre empresas, permisos y auditoría.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { entornoImportar } from "./importar-entorno";

const CUENTAS =
  "Nombre;R.U.T.;Giro;Estado;Comuna\n" +
  "Acme;76.543.210-3;;cliente activo;Las Condes\n" +
  "Beta Ltda;11.111.111-2;Transporte;;\n" +
  "Gama;;Retail;prospecto;Maipú\n" +
  "Acme repetida;76543210-3;;;\n";

describe.skipIf(!urlPropietario)("core · importador de cuentas en base real", () => {
  let x: Awaited<ReturnType<typeof entornoImportar>>;
  beforeAll(async () => {
    x = await entornoImportar();
  });
  afterAll(async () => {
    await x?.e.cerrar();
  });
  const cuentas = (t: string) => x.e.admin.cuenta.findMany({ where: { tenantId: t }, orderBy: { nombre: "asc" } });

  it("el catálogo lista los importadores con sus campos", async () => {
    const r = await x.run<{ importadores: { id: string; disponible: boolean; campos: { clave: string; requerido: boolean }[] }[] }>(x.t1, "core.importar.catalogo", {});
    expect(r.ok && r.data.importadores.map((i) => [i.id, i.disponible])).toEqual([["cuentas", true], ["contactos", true], ["instalaciones", true], ["negocios", true], ["personas", true]]);
    const sinComercial = await x.run<{ importadores: { id: string; disponible: boolean }[] }>(x.t1, "core.importar.catalogo", {}, { modulos: [] });
    expect(sinComercial.ok && sinComercial.data.importadores.find((i) => i.id === "negocios")?.disponible).toBe(false);
  });

  it("la simulación mapea columnas, valida fila por fila y no guarda nada", async () => {
    const s = await x.importar(x.t1, "cuentas", { archivo: x.csv(CUENTAS) }, true);
    expect(s.simulacion).toBe(true);
    expect(s.mapeo).toMatchObject({ Nombre: "nombre", "R.U.T.": "rut", Giro: "giro", Estado: "estado", Comuna: "comuna" });
    expect(s.conteos).toEqual({ crear: 2, actualizar: 0, sin_cambio: 0, error: 2 });
    expect(s.filas.find((f) => f.fila === 3)?.mensajes[0]).toMatch(/RUT inválido/);
    expect(s.filas.find((f) => f.fila === 5)?.mensajes[0]).toMatch(/El RUT se repite en la fila 2/);
    expect(await cuentas(x.t1)).toHaveLength(0);
    expect(await x.e.admin.importacion.count({ where: { tenantId: x.t1 } })).toBe(0);
  });

  it("sin la columna obligatoria no importa y lo dice", async () => {
    const s = await x.importar(x.t1, "cuentas", { archivo: x.csv("RUT;Giro\n76.543.210-3;X\n") }, true);
    expect(s.bloqueos).toEqual(["Falta una columna para «Nombre», que es obligatorio."]);
    const real = await x.run(x.t1, "core.importar.ejecutar", { importador: "cuentas", archivo: x.csv("RUT;Giro\n76.543.210-3;X\n") });
    expect(real.ok).toBe(false);
  });

  it("aplica las filas válidas, deja el lote y la auditoría sin el contenido de la planilla", async () => {
    const r = await x.importar(x.t1, "cuentas", { archivo: x.csv(CUENTAS) });
    expect(r.conteos).toEqual({ crear: 2, actualizar: 0, sin_cambio: 0, error: 2 });
    expect((await cuentas(x.t1)).map((c) => [c.nombre, c.rut, c.estado, c.comuna])).toEqual([
      ["Acme", "76543210-3", "cliente_activo", "Las Condes"],
      ["Gama", null, "prospecto", "Maipú"],
    ]);
    const lote = await x.e.admin.importacion.findFirstOrThrow({ where: { id: r.importacionId ?? "" }, include: { filas: true } });
    expect([lote.estado, lote.versionContrato, lote.sistema, lote.origen]).toEqual(["completada", "motor-archivo/v1", "archivo", "csv"]);
    expect(lote.filas.map((f) => f.accion).sort()).toEqual(["creado", "creado", "omitido", "omitido"]);
    const auditoria = await x.e.admin.auditEvent.findMany({ where: { tenantId: x.t1, capability: "core.importar.ejecutar" } });
    expect(auditoria).toHaveLength(1);
    expect(JSON.stringify(auditoria)).not.toContain(Buffer.from(CUENTAS).toString("base64").slice(0, 40));
  });

  it("reimportar no duplica; «completar» llena solo lo vacío y «sobrescribir» reemplaza", async () => {
    const igual = await x.importar(x.t1, "cuentas", { archivo: x.csv(CUENTAS) });
    expect(igual.conteos).toMatchObject({ crear: 0, actualizar: 0, sin_cambio: 2 });
    expect(igual.importacionId).toBeNull();
    const filas = [{ nombre: "ACME", rut: "76.543.210-3", giro: "Logística", comuna: "Providencia" }];
    const completar = await x.importar(x.t1, "cuentas", { filas });
    expect(completar.filas[0]).toMatchObject({ accion: "actualizar", cambios: ["giro"] });
    const sobre = await x.importar(x.t1, "cuentas", { filas, alExistir: "sobrescribir" });
    expect(sobre.filas[0]?.cambios).toEqual(["comuna"]);
    const acme = (await cuentas(x.t1)).find((c) => c.rut === "76543210-3");
    expect([acme?.nombre, acme?.giro, acme?.comuna]).toEqual(["Acme", "Logística", "Providencia"]);
    expect(await cuentas(x.t1)).toHaveLength(2);
  });

  it("cada empresa importa en lo suyo: la otra no ve ni puede referirse a esas cuentas", async () => {
    expect(await cuentas(x.t2)).toHaveLength(0);
    const ajeno = await x.importar(x.t2, "contactos", { filas: [{ cuenta_rut: "76.543.210-3", nombres: "Eva" }] }, true);
    expect(ajeno.filas[0]).toMatchObject({ accion: "error", mensajes: ["No hay una cuenta con ese RUT en OPAI. Importa primero las cuentas."] });
    const propia = await x.importar(x.t2, "cuentas", { filas: [{ nombre: "Acme", rut: "76.543.210-3" }] });
    expect(propia.conteos.crear).toBe(1);
    expect((await x.e.admin.importacion.findMany({ where: { tenantId: x.t2 } })).map((l) => l.id)).toEqual([propia.importacionId]);
    const lotes = await x.run<{ items: { id: string }[] }>(x.t2, "core.importar.lotes", {});
    expect(lotes.ok && lotes.data.items.map((l) => l.id)).toEqual([propia.importacionId]);
  });

  it("un CSV de Excel en Windows-1252 conserva tildes y eñes, y un id de origen con otro RUT no pisa la cuenta", async () => {
    const latin1 = { nombre: "win.csv", contenidoBase64: Buffer.from("nombre;comuna\nPe\u00f1a y C\u00eda;\u00d1u\u00f1oa\n", "latin1").toString("base64") };
    const s = await x.importar(x.t1, "cuentas", { archivo: latin1 }, true);
    expect(s.filas[0]?.etiqueta).toBe("Peña y Cía");
    await x.importar(x.t1, "cuentas", { filas: [{ id_externo: "A-1", nombre: "Omega", rut: "77.777.777-7" }] });
    const otra = await x.importar(x.t1, "cuentas", { filas: [{ id_externo: "A-1", nombre: "Otra empresa", rut: "76.543.210-3" }], alExistir: "sobrescribir" }, true);
    expect(otra.filas[0]?.accion).toBe("error");
  });

  it("una cuenta activa en el origen queda activa; «prospecto» nunca baja a un cliente", async () => {
    const filas = (estado: string) => [{ nombre: "Promovida SpA", rut: "77.111.222-6", estado }];
    await x.importar(x.t1, "cuentas", { filas: filas("prospecto") });
    const sube = await x.importar(x.t1, "cuentas", { filas: filas("cliente activo") });
    expect(sube.filas[0]).toMatchObject({ accion: "actualizar", cambios: ["estado"] });
    const baja = await x.importar(x.t1, "cuentas", { filas: filas("prospecto"), alExistir: "sobrescribir" });
    expect(baja.filas[0]?.accion).toBe("sin_cambio");
    expect((await cuentas(x.t1)).find((c) => c.nombre === "Promovida SpA")?.estado).toBe("cliente_activo");
  });

  it("importan owner, admin y gerente; supervisor no", async () => {
    const con = (rol: "gerente" | "supervisor") =>
      x.run(x.t1, "core.importar.ejecutar", { importador: "cuentas", filas: [{ nombre: "X" }] }, { rol, dryRun: true });
    expect((await con("gerente")).ok).toBe(true);
    const sup = await con("supervisor");
    expect(sup.ok ? "ok" : sup.error.code).toBe("FORBIDDEN");
  });
});
