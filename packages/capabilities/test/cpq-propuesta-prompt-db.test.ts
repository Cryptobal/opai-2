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
  const usuario = randomUUID();
  const medidor = { registrar: async () => undefined };
  const run = (rol: string) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId,
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
    expect(r.data.texto).toContain("{{#cada instalaciones}}");
    expect(r.data.texto).not.toContain("Empresa Secreta QA");
  });

  it("sin permiso de CPQ la lectura se rechaza", async () => {
    const r = await run("supervisor");
    expect(r.ok).toBe(false);
  });
});
