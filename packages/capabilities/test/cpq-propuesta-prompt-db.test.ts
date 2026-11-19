// CAR-138 PR 8 · Prompt exportable de la propuesta técnica contra Postgres real: sale del catálogo, no
// lleva datos de ninguna empresa y exige el permiso de lectura de CPQ.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string } };
type Prompt = { version: number; finalidad: string; texto: string; claves: string[] };

describe.skipIf(!urlPropietario)("cpq · prompt exportable en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId: string;
  let otroTenantId: string;
  const usuario = randomUUID();
  const medidor = { registrar: async () => undefined };
  const run = (rol: "owner" | "supervisor", tenant = tenantId) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId: tenant,
        actor: { tipo: "user", id: usuario },
        usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
        portal: "erp",
        portalesMembresia: ["erp"],
        rol,
        modulosActivos: ["comercial", "cpq"],
        medidor,
      }),
      "cpq.propuestas_tecnica.prompt_exportable",
      {},
    ) as Promise<Res<Prompt>>;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...capacidadesCpq]);
    registrarModuloComercial();
    await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@cpq.test`, name: "Ana", emailVerified: true } });
    const t = await e.admin.tenant.create({ data: { slug: `pr8-${randomUUID().slice(0, 8)}`, nombre: "Empresa Secreta QA", vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    tenantId = t.id;
    await e.admin.perfilEmpresa.create({ data: { tenantId, colorPrimario: "#123abc" } });
    const otro = await e.admin.tenant.create({ data: { slug: `car531-${randomUUID().slice(0, 8)}`, nombre: "Otra QA", vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), otro.id);
    await e.admin.perfilEmpresa.create({ data: { tenantId: otro.id, colorPrimario: "#fedcba" } });
    otroTenantId = otro.id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("entrega el prompt del catálogo, con la versión y sin datos de la empresa", async () => {
    const r = await run("owner");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.finalidad).toBe("propuesta");
    expect(r.data.claves).toEqual(expect.arrayContaining(["cuenta.nombre", "instalacion.nombre"]));
    expect(r.data.texto).toContain("{{#cada puestos}}");
    expect(r.data.texto).toContain("Planta Ficticia Norte"); // ejemplo del catálogo, no un dato de la empresa
  });

  it("suma el estilo de su propia empresa y nunca el de otra (CAR-531)", async () => {
    const a = await run("owner");
    const b = await run("owner", otroTenantId);
    if (!a.ok || !b.ok) throw new Error("el prompt debía salir");
    expect(a.data.texto).toContain("`#123abc`");
    expect(a.data.texto).not.toContain("#fedcba");
    expect(b.data.texto).toContain("`#fedcba`");
    expect(b.data.texto).not.toContain("#123abc");
    expect(a.data.texto).toContain("no tiene logo cargado");
  });

  it("sin permiso de CPQ la lectura se rechaza", async () => {
    const r = await run("supervisor");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
  });
});
