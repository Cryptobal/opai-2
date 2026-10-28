// CAR-62 (pendiente del Revisor en el PR #104): las instalaciones de Negocios contra Postgres real,
// con un rol sin BYPASSRLS. Una instalación de otra empresa no existe para la RLS (NOT_FOUND); una
// fuera del alcance del supervisor responde igual (ADR-022), y una archivada no se vincula.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { Alcance } from "../src/types";

describe("comercial · instalaciones de Negocios en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let cuentaA = "";
  let instA = "";
  let instA2 = "";
  let instB = "";
  const medidor = { registrar: async () => undefined };

  const ctxOwner = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      modulosActivos: ["comercial"],
      medidor,
    });
  // Supervisor al que una excepción le concede gestionar Comercial; alcance por instalaciones.
  const ctxAcotado = (alcance: Alcance) =>
    mod.crearContexto({
      tenantId: tenantA,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "supervisor",
      excepciones: [
        { permiso: "comercial:negocios.read", conceder: true },
        { permiso: "comercial:negocios.manage", conceder: true },
      ],
      modulosActivos: ["comercial"],
      alcance,
      medidor,
    });
  type Ctx = ReturnType<typeof ctxOwner>;

  async function dato<T>(ctx: Ctx, id: string, input: unknown) {
    const r = await mod.executeCapability(ctx, id, input, {});
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  async function codigo(ctx: Ctx, id: string, input: unknown) {
    const r = await mod.executeCapability(ctx, id, input, {});
    return r.ok ? "OK" : r.error.code;
  }
  async function empresa(nombre: string) {
    const t = await e.admin.tenant.create({
      data: { slug: `com-inst-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" },
    });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const o = ctxOwner(t.id);
    const cuentaId = (await dato<{ id: string }>(o, "core.cuentas.create", { nombre })).id;
    const inst = async (n: string) =>
      (await dato<{ id: string }>(o, "core.instalaciones.create", { cuentaId, nombre: n })).id;
    return { tenantId: t.id, cuentaId, inst };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
    const a = await empresa("Alfa");
    tenantA = a.tenantId;
    cuentaA = a.cuentaId;
    instA = await a.inst("Planta Alfa");
    instA2 = await a.inst("Bodega Alfa");
    instB = await (await empresa("Beta")).inst("Planta Beta");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const negocios = () => e.admin.negocio.count({ where: { tenantId: tenantA } });

  it("create con una instalación de otra empresa responde NOT_FOUND y no crea nada", async () => {
    const antes = await negocios();
    const r = await codigo(ctxOwner(tenantA), "comercial.negocios.create", {
      cuentaId: cuentaA,
      titulo: "Instalación ajena",
      instalaciones: [{ instalacionId: instB }],
    });
    expect(r).toBe("NOT_FOUND");
    expect(await negocios()).toBe(antes);
  });

  it("el supervisor no crea ni vincula fuera de su alcance; dentro sí vincula", async () => {
    const acotado = ctxAcotado({ instalaciones: [instA] });
    const crear = {
      cuentaId: cuentaA,
      titulo: "Fuera de alcance",
      instalaciones: [{ instalacionId: instA2 }],
    };
    expect(await codigo(acotado, "comercial.negocios.create", crear)).toBe("NOT_FOUND");
    const n = await dato<{ id: string }>(ctxOwner(tenantA), "comercial.negocios.create", {
      cuentaId: cuentaA,
      titulo: "Del owner",
    });
    const vincular = (instalacionId: string) =>
      codigo(acotado, "comercial.negocios.vincular_instalacion", { negocioId: n.id, instalacionId });
    expect(await vincular(instA2)).toBe("NOT_FOUND");
    expect(await vincular(instB)).toBe("NOT_FOUND");
    expect(await vincular(instA)).toBe("OK");
    const vinculos = await e.admin.negocioInstalacion.findMany({ where: { negocioId: n.id } });
    expect(vinculos.map((v) => v.instalacionId)).toEqual([instA]);
  });

  // Archiva instA2: va al final porque los casos anteriores la usan sin archivar.
  it("no vincula una instalación archivada, al crear ni después", async () => {
    const o = ctxOwner(tenantA);
    await dato(o, "core.instalaciones.archive", { id: instA2 });
    const r = await codigo(o, "comercial.negocios.create", {
      cuentaId: cuentaA,
      titulo: "Archivada",
      instalaciones: [{ instalacionId: instA2 }],
    });
    expect(r).toBe("UNPROCESSABLE");
    const n = await dato<{ id: string }>(o, "comercial.negocios.create", {
      cuentaId: cuentaA,
      titulo: "Sin instalación",
    });
    const v = { negocioId: n.id, instalacionId: instA2 };
    expect(await codigo(o, "comercial.negocios.vincular_instalacion", v)).toBe("UNPROCESSABLE");
  });
});
