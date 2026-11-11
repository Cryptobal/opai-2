// CAR-279 · Contactos, instalaciones y negocios, plantilla Excel, cargas por partes, export de OPAI 1 y reversión de lotes.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { entornoImportar } from "./importar-entorno";

type Reversion = { revertido: boolean; aBorrar: number; aRestaurar: number; bloqueadas: { registro: string; motivo: string }[] };

const OPAI1 = {
  accounts: [
    { id: "acc-1", name: "Delta", legalName: "Delta SpA", rut: "77.777.777-7", status: "client_active", commune: "Ñuñoa" },
    { id: "acc-2", name: "Épsilon", type: "prospect" },
  ],
  contacts: [{ id: "con-1", accountId: "acc-1", firstName: "Luis", lastName: "Rojas", email: "LUIS@delta.cl", isPrimary: true, recibeFacturacion: true }],
  installations: [{ id: "ins-1", accountId: "acc-1", name: "Casa matriz", commune: "Ñuñoa", lat: -33.45, lng: -70.6, status: "active" }],
  pipelineStages: [{ id: "st-1", name: "Etapa inexistente" }],
  deals: [{ id: "deal-1", accountId: "acc-1", stageId: "st-1", title: "Guardias casa matriz", amount: 2500000, ownerId: "u-1" }],
  users: [{ id: "u-1", email: "nadie@otra.cl" }],
};

describe.skipIf(!urlPropietario)("core · importador: entidades hijas, lotes y reversión", () => {
  let x: Awaited<ReturnType<typeof entornoImportar>>;
  let loteCuentas = "";
  beforeAll(async () => {
    x = await entornoImportar();
  });
  afterAll(async () => {
    await x?.e.cerrar();
  });
  const revertir = async (id: string, dryRun = false) => {
    const r = await x.run<Reversion>(x.t1, "core.importar.revertir", { importacionId: id }, { dryRun });
    if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
    return r.data;
  };

  it("la plantilla Excel descargada se importa tal cual", async () => {
    const p = await x.run<{ nombre: string; contenidoBase64: string }>(x.t1, "core.importar.plantilla", { importador: "cuentas", formato: "xlsx" });
    if (!p.ok) throw new Error(p.error.message);
    const s = await x.importar(x.t1, "cuentas", { archivo: { nombre: p.data.nombre, contenidoBase64: p.data.contenidoBase64 } }, true);
    expect(s.conteos).toMatchObject({ crear: 1, error: 0 });
    expect(s.columnasIgnoradas).toEqual([]);
  });

  it("una planilla larga se carga por partes en un mismo lote", async () => {
    const filas = Array.from({ length: 520 }, (_, i) => `Cliente ${String(i).padStart(3, "0")}`).join("\n");
    const archivo = x.csv(`nombre\n${filas}\n`);
    const a = await x.importar(x.t1, "cuentas", { archivo });
    expect([a.totalFilas, a.conteos.crear, a.siguiente]).toEqual([520, 500, 500]);
    const b = await x.importar(x.t1, "cuentas", { archivo, desde: a.siguiente, importacionId: a.importacionId });
    expect([b.conteos.crear, b.siguiente, b.importacionId]).toEqual([20, null, a.importacionId]);
    expect(await x.e.admin.cuenta.count({ where: { tenantId: x.t1 } })).toBe(520);
    expect((await revertir(a.importacionId ?? "")).aBorrar).toBe(520);
    expect(await x.e.admin.cuenta.count({ where: { tenantId: x.t1 } })).toBe(0);
  });

  it("el export de OPAI 1 se importa por entidad y repetirlo no duplica", async () => {
    const cuentas = await x.importar(x.t1, "cuentas", { opai1: OPAI1 });
    loteCuentas = cuentas.importacionId ?? "";
    expect(cuentas.conteos.crear).toBe(2);
    const contactos = await x.importar(x.t1, "contactos", { opai1: OPAI1 });
    const instalaciones = await x.importar(x.t1, "instalaciones", { opai1: OPAI1 });
    const negocios = await x.importar(x.t1, "negocios", { opai1: OPAI1 });
    expect([contactos.conteos.crear, instalaciones.conteos.crear, negocios.conteos.crear]).toEqual([1, 1, 1]);
    expect(negocios.filas[0]?.mensajes).toHaveLength(2);
    const delta = await x.e.admin.cuenta.findFirstOrThrow({ where: { tenantId: x.t1, rut: "77777777-7" }, include: { contactos: true, instalaciones: true, negocios: true } });
    expect([delta.estado, delta.razonSocial, delta.contactos[0]?.email, delta.contactos[0]?.roles, delta.instalaciones[0]?.estado]).toEqual([
      "cliente_activo", "Delta SpA", "luis@delta.cl", ["facturacion"], "activa",
    ]);
    expect([delta.negocios[0]?.montoEstimadoMensual, delta.negocios[0]?.estado]).toEqual([2500000, "abierto"]);
    expect(await x.e.admin.idExterno.count({ where: { tenantId: x.t1, sistema: "opai1" } })).toBe(5);
    for (const imp of ["cuentas", "contactos", "instalaciones", "negocios"]) {
      const otra = await x.importar(x.t1, imp, { opai1: OPAI1 }, true);
      expect([imp, otra.conteos.crear, otra.conteos.error]).toEqual([imp, 0, 0]);
    }
    expect(await x.e.admin.historialEtapa.count({ where: { tenantId: x.t1 } })).toBe(1);
  });

  it("una planilla común reconoce por RUT la cuenta que vino de OPAI 1 y completa el contacto por correo", async () => {
    const r = await x.importar(x.t1, "contactos", { filas: [{ "RUT cliente": "77.777.777-7", nombre: "Luis", apellido: "Rojas", mail: "luis@delta.cl", celular: "9 8765 4321" }] });
    expect(r.filas[0]).toMatchObject({ accion: "actualizar", cambios: ["telefono"] });
    expect((await x.e.admin.contacto.findFirstOrThrow({ where: { tenantId: x.t1, email: "luis@delta.cl" } })).telefono).toBe("+56987654321");
    expect((await revertir(r.importacionId ?? "")).aRestaurar).toBe(1);
    expect((await x.e.admin.contacto.findFirstOrThrow({ where: { tenantId: x.t1, email: "luis@delta.cl" } })).telefono).toBeNull();
  });

  it("no revierte un lote cuyos registros ya tienen datos asociados o cambiaron después", async () => {
    const vista = await revertir(loteCuentas, true);
    expect(vista).toMatchObject({ revertido: false, aBorrar: 2 });
    expect(vista.bloqueadas).toEqual([{ registro: "Delta", motivo: "tiene contactos, instalaciones, negocios u otros datos asociados" }]);
    expect((await revertir(loteCuentas)).revertido).toBe(false);
    expect(await x.e.admin.cuenta.count({ where: { tenantId: x.t1 } })).toBe(2);
    // Ley 21.719: un contacto anonimizado no se vuelve a llenar al reimportar el mismo export.
    await x.e.admin.contacto.updateMany({ where: { tenantId: x.t1, email: "luis@delta.cl" }, data: { anonimizadoEn: new Date(), email: null, nombres: "Anonimizado", apellidos: "" } });
    const otraVez = await x.importar(x.t1, "contactos", { opai1: OPAI1 }, true);
    expect(otraVez.filas[0]).toMatchObject({ accion: "error", mensajes: ["Este contacto fue anonimizado y no se puede volver a cargar."] });
    const dos = await x.run(x.t2, "core.importar.revertir", { importacionId: loteCuentas });
    expect(dos.ok ? "ok" : dos.error.code).toBe("NOT_FOUND");
  });
});
