// CAR-27 (parte 2): exportar negocios a Excel respeta filtros, permiso y aislamiento entre empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";
import { leerExcel } from "@opai/domain/importacion";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Mod from "../src";

type Salida = { nombre: string; mime: string; base64: string; total: number; truncado: boolean };

describe.skipIf(!urlPropietario)("comercial.negocios.exportar (CAR-27)", () => {
  let e: Entorno, mod: typeof Mod;
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string, rol: "owner" | "supervisor" | "viewer" = "owner") =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol, modulosActivos: ["comercial"], medidor });
  async function dato<T>(tenantId: string, id: string, input: unknown) {
    const r = await mod.executeCapability(ctx(tenantId), id, input, {});
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  async function filasDe(s: Salida) {
    const tabla = await leerExcel(new Uint8Array(Buffer.from(s.base64, "base64")));
    return tabla.filas.map((f) => f[0] ?? "");
  }
  async function empresa(nombre: string, titulos: string[]) {
    const t = await e.admin.tenant.create({ data: { slug: `exp-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const cuenta = await dato<{ id: string }>(t.id, "core.cuentas.create", { nombre });
    for (const titulo of titulos) await dato(t.id, "comercial.negocios.create", { cuentaId: cuenta.id, titulo });
    return { tenantId: t.id, cuentaId: cuenta.id };
  }
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("exporta los negocios de la empresa y no los de otra", async () => {
    const a = await empresa("Alfa", ["Guardias Norte", "Aseo Sur"]);
    await empresa("Beta", ["Negocio ajeno"]);
    const s = await dato<Salida>(a.tenantId, "comercial.negocios.exportar", {});
    expect(s.mime).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(s.nombre).toMatch(/^negocios-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(s.total).toBe(2);
    expect(s.truncado).toBe(false);
    expect((await filasDe(s)).sort()).toEqual(["Aseo Sur", "Guardias Norte"]);
  });

  it("aplica los mismos filtros que la lista (texto y estado)", async () => {
    const a = await empresa("Gamma", ["Guardias Norte", "Aseo Sur"]);
    const s = await dato<Salida>(a.tenantId, "comercial.negocios.exportar", { q: "aseo" });
    expect(await filasDe(s)).toEqual(["Aseo Sur"]);
    const ganados = await dato<Salida>(a.tenantId, "comercial.negocios.exportar", { estado: "ganado" });
    expect(ganados.total).toBe(0);
  });

  it("corta en el límite y avisa que quedó incompleto", async () => {
    const a = await empresa("Delta", ["Uno", "Dos", "Tres"]);
    const s = await dato<Salida>(a.tenantId, "comercial.negocios.exportar", { limite: 2 });
    expect(s.total).toBe(2);
    expect(s.truncado).toBe(true);
  });

  it("exige el permiso de exportar: supervisor y visor no pueden", async () => {
    const a = await empresa("Epsilon", ["Guardias Norte"]);
    for (const rol of ["supervisor", "viewer"] as const) {
      const r = await mod.executeCapability(ctx(a.tenantId, rol), "comercial.negocios.exportar", {}, {});
      expect(r.ok).toBe(false);
    }
    const gerente = await mod.executeCapability(
      mod.crearContexto({ tenantId: a.tenantId, actor: { tipo: "system" }, rol: "gerente", modulosActivos: ["comercial"], medidor }),
      "comercial.negocios.exportar",
      {},
      {},
    );
    expect(gerente.ok).toBe(true);
  });
});
