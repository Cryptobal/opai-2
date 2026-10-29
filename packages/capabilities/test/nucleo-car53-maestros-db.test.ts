// CAR-53 · Maestros sin test: core.cuentas.update, core.cuentas.set_representantes,
// core.contactos.update, core.contactos.archive, core.instalaciones.update y core.puestos.get.
// Autorización, dryRun, auditoría y alcance por instalaciones contra Postgres real.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { type Car53, prepararCar53 } from "./nucleo-car53-fixture";

const MANAGE = ["core:cuentas.manage", "core:instalaciones.manage"];

describe.skipIf(!urlPropietario)("CAR-53 · maestros del Núcleo", () => {
  let f: Car53;
  const id = {
    alfa: "",
    beta: "",
    instAlfa: "",
    instBeta: "",
    contactoAlfa: "",
    contactoBeta: "",
    puestoAlfa: "",
    puestoBeta: "",
  };

  beforeAll(async () => {
    f = await prepararCar53("car53-maes");
    const o = f.owner();
    const crear = async (cap: string, input: unknown) =>
      (await f.dato<{ id: string }>(o, cap, input)).id;
    id.alfa = await crear("core.cuentas.create", { nombre: "Alfa" });
    id.beta = await crear("core.cuentas.create", { nombre: "Beta" });
    id.instAlfa = await crear("core.instalaciones.create", {
      cuentaId: id.alfa,
      nombre: "Planta Alfa",
    });
    id.instBeta = await crear("core.instalaciones.create", {
      cuentaId: id.beta,
      nombre: "Planta Beta",
    });
    id.contactoAlfa = await crear("core.contactos.create", {
      cuentaId: id.alfa,
      nombres: "Ana",
      apellidos: "Alfa",
    });
    id.contactoBeta = await crear("core.contactos.create", {
      cuentaId: id.beta,
      nombres: "Beto",
      apellidos: "Beta",
    });
    const cargoId = await crear("core.cargos.create", { nombre: "Guardia" });
    const puesto = {
      cargoId,
      nombre: "Noche",
      diasTrabajo: 4,
      diasDescanso: 4,
      horaInicio: "20:00",
      horaFin: "08:00",
    };
    id.puestoAlfa = await crear("core.puestos.create", { ...puesto, instalacionId: id.instAlfa });
    id.puestoBeta = await crear("core.puestos.create", { ...puesto, instalacionId: id.instBeta });
  });

  afterAll(async () => {
    await f?.cerrar();
  });

  const acotado = () => f.acotado({ instalaciones: [id.instAlfa] }, MANAGE);
  const fueraDeAlcance = async (cap: string, input: unknown) =>
    expect(await f.mod.executeCapability(acotado(), cap, input)).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });

  it("core.cuentas.update", async () => {
    const leer = () =>
      f.e.admin.cuenta.findUniqueOrThrow({ where: { id: id.alfa }, select: { giro: true } });
    const r = await f.probarEscritura<{ giro: string }>(
      "core.cuentas.update",
      { id: id.alfa, giro: "Minería" },
      leer,
    );
    expect(r.giro).toBe("Minería");
    await fueraDeAlcance("core.cuentas.update", { id: id.beta, giro: "Otra" });
    await f.dato(acotado(), "core.cuentas.update", { id: id.alfa, giro: "Minería y energía" });
  });

  it("core.cuentas.set_representantes", async () => {
    const leer = () =>
      f.e.admin.cuentaRepresentante.findMany({
        where: { cuentaId: id.alfa },
        select: { rut: true },
      });
    const input = {
      cuentaId: id.alfa,
      representantes: [{ nombre: "Rosa Rivas", rut: "11.111.111-1" }],
    };
    const r = await f.probarEscritura<{ rut: string }[]>(
      "core.cuentas.set_representantes",
      input,
      leer,
    );
    expect(r).toHaveLength(1);
    await fueraDeAlcance("core.cuentas.set_representantes", { ...input, cuentaId: id.beta });
    expect(await f.e.admin.cuentaRepresentante.count({ where: { cuentaId: id.beta } })).toBe(0);
  });

  it("core.contactos.update", async () => {
    const leer = () =>
      f.e.admin.contacto.findUniqueOrThrow({
        where: { id: id.contactoAlfa },
        select: { cargo: true },
      });
    const r = await f.probarEscritura<{ cargo: string }>(
      "core.contactos.update",
      { id: id.contactoAlfa, cargo: "Jefa" },
      leer,
    );
    expect(r.cargo).toBe("Jefa");
    await fueraDeAlcance("core.contactos.update", { id: id.contactoBeta, cargo: "Otro" });
  });

  it("core.contactos.archive", async () => {
    const leer = () =>
      f.e.admin.contacto.findUniqueOrThrow({
        where: { id: id.contactoAlfa },
        select: { archivadoEn: true },
      });
    await f.probarEscritura("core.contactos.archive", { id: id.contactoAlfa }, leer);
    await fueraDeAlcance("core.contactos.archive", { id: id.contactoBeta });
    const beta = await f.e.admin.contacto.findUniqueOrThrow({ where: { id: id.contactoBeta } });
    expect(beta.archivadoEn).toBeNull();
  });

  it("core.instalaciones.update", async () => {
    const leer = () =>
      f.e.admin.instalacion.findUniqueOrThrow({
        where: { id: id.instAlfa },
        select: { notas: true },
      });
    const r = await f.probarEscritura<{ notas: string }>(
      "core.instalaciones.update",
      { id: id.instAlfa, notas: "Portón norte" },
      leer,
    );
    expect(r.notas).toBe("Portón norte");
    await fueraDeAlcance("core.instalaciones.update", { id: id.instBeta, notas: "Otra" });
    await f.dato(acotado(), "core.instalaciones.update", { id: id.instAlfa, notas: "Portón sur" });
  });

  it("core.puestos.get: lectura auditada, con alcance y sin permiso", async () => {
    const antes = await f.auditorias("core.puestos.get");
    const p = await f.dato<{ id: string; nombre: string }>(f.owner(), "core.puestos.get", {
      id: id.puestoAlfa,
    });
    expect(p).toMatchObject({ id: id.puestoAlfa, nombre: "Noche" });
    // Lectura auditada (NÚCLEO-H): registra el id revelado.
    expect(await f.auditorias("core.puestos.get")).toBe(antes + 1);
    const ultima = await f.e.admin.auditEvent.findFirstOrThrow({
      where: { tenantId: f.tenantId, capability: "core.puestos.get" },
      orderBy: { seq: "desc" },
    });
    expect(JSON.stringify(ultima.payload)).toContain(id.puestoAlfa);
    await fueraDeAlcance("core.puestos.get", { id: id.puestoBeta });
    expect(await f.dato(acotado(), "core.puestos.get", { id: id.puestoAlfa })).toMatchObject({
      id: id.puestoAlfa,
    });
    const sinPermiso = f.mod.crearContexto({
      tenantId: f.tenantId,
      actor: { tipo: "user", id: f.userId },
      rol: "viewer",
      excepciones: [{ permiso: "core:instalaciones.read", conceder: false }],
      medidor: { registrar: async () => undefined },
    });
    expect(
      await f.mod.executeCapability(sinPermiso, "core.puestos.get", { id: id.puestoAlfa }),
    ).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});
