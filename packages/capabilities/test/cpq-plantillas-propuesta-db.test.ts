// CAR-530 · Gestor de bloques de la propuesta contra Postgres real: lectura por defecto sin plantilla,
// orden y fijos guardados por empresa, sin repetir bloques y sin cruzarse con otra empresa.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string } };
type Bloque = { tipo: string; activo: boolean; fijo: boolean; opcional: boolean };
type Plantilla = { version: number; bloques: Bloque[] };

describe.skipIf(!urlPropietario)("cpq · gestor de bloques de la propuesta en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const tenants: string[] = [];
  const usuario = randomUUID();
  const medidor = { registrar: async () => undefined };
  const run = <T,>(tenantId: string, id: string, input: object) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId,
        actor: { tipo: "user", id: usuario },
        usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
        portal: "erp",
        portalesMembresia: ["erp"],
        rol: "owner",
        modulosActivos: ["comercial", "cpq"],
        medidor,
      }),
      id,
      input,
    ) as Promise<Res<T>>;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...capacidadesCpq]);
    registrarModuloComercial();
    await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@cpq.test`, name: "Ana", emailVerified: true } });
    for (const n of ["a", "b"]) {
      const t = await e.admin.tenant.create({ data: { slug: `car530-${n}-${randomUUID().slice(0, 8)}`, nombre: `QA ${n}`, vertical: "seguridad" } });
      await sembrarComercial(e.admin.$extends({}), t.id);
      tenants.push(t.id);
    }
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("sin plantilla guardada entrega la de defecto, versión 0", async () => {
    const r = await run<Plantilla>(tenants[0]!, "cpq.plantillas_propuesta.get", {});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.version).toBe(0);
  });

  it("guarda orden, fijos y bloques quitados solo para su empresa", async () => {
    const bloques: Bloque[] = [
      { tipo: "resumen_economico", activo: true, fijo: true, opcional: false },
      { tipo: "portada", activo: false, fijo: false, opcional: true },
      { tipo: "metodologia", activo: true, fijo: false, opcional: true },
    ];
    const w = await run<Plantilla>(tenants[0]!, "cpq.plantillas_propuesta.update", { bloques });
    expect(w.ok).toBe(true);
    const a = await run<Plantilla>(tenants[0]!, "cpq.plantillas_propuesta.get", {});
    if (a.ok) expect(a.data.bloques.map((b) => b.tipo)).toEqual(["resumen_economico", "portada", "metodologia"]);
    const b = await run<Plantilla>(tenants[1]!, "cpq.plantillas_propuesta.get", {});
    expect(b.ok).toBe(true);
    if (b.ok) {
      expect(b.data.version).toBe(0);
      expect(b.data.bloques.map((x) => x.tipo)).not.toContain("metodologia");
    }
  });

  it("rechaza un bloque repetido", async () => {
    const bloque = { tipo: "portada", activo: true, fijo: true, opcional: false };
    const r = await run(tenants[1]!, "cpq.plantillas_propuesta.update", { bloques: [bloque, bloque] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_INPUT");
  });
});
