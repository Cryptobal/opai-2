// CAR-571 · Marcadores de empresa, negocio, cotización y puestos en plantilla HTML (Postgres real, dos empresas).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { renderizarPlantillaCampos } from "@opai/domain";
import { sembrarComercial } from "@opai/db";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { htmlConValores } from "../../../modules/cpq/persistencia/propuesta-html-uso";
import { resolverCamposPropuesta } from "../../../modules/cpq/persistencia/valores-campos-propuesta";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

const HTML = [
  "<section>",
  "<h1>{{empresa.nombre}} · {{cuenta.nombre}}</h1>",
  "<p>Negocio: {{negocio.titulo}} · Cotización {{cotizacion.codigo}} v{{cotizacion.version}}</p>",
  "<p>Válida hasta {{cotizacion.valida_hasta | fecha}} · {{cotizacion.venta_mensual | clp}}/mes</p>",
  "{{tabla_servicio}}",
  "{{resumen_economico}}",
  "{{#cada puestos}}<p>{{puesto.nombre}}: {{puesto.cantidad}} guardias · {{puesto.precio_mensual | clp}}</p>{{/cada}}",
  "</section>",
].join("\n");

describe.skipIf(!urlPropietario)("cpq · marcadores HTML de propuesta (CAR-571)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const usuario = randomUUID();
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["comercial", "cpq"],
      medidor,
    });

  let tenantId: string;
  let cotizacionId: string;
  let cuentaNombre: string;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...capacidadesCpq]);
    registrarModuloComercial();
    await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@cpq.test`, name: "Ana", emailVerified: true } });
    const t = await e.admin.tenant.create({ data: { slug: `cp571-${randomUUID().slice(0, 8)}`, nombre: "Ficticia Seguridad", vertical: "seguridad" } });
    tenantId = t.id;
    await sembrarComercial(e.admin.$extends({}), tenantId);
    cuentaNombre = "Cliente Ficticio CP571";
    const run = async <T>(id: string, input: unknown) => {
      const sistema = mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor });
      const r = (await mod.executeCapability(sistema, id, input, { dryRun: false })) as
        | { ok: true; data: T }
        | { ok: false; error: unknown };
      if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
      return r.data;
    };
    const cuentaId = (await run<{ id: string }>("core.cuentas.create", { nombre: cuentaNombre })).id;
    const neg = await run<{ id: string; cuentaId: string }>("comercial.negocios.create", {
      cuentaId,
      titulo: "Guardias ficticias",
    });
    const cot = await e.admin.cpqCotizacion.create({
      data: {
        tenantId,
        negocioId: neg.id,
        codigo: "CPQ-571",
        titulo: "Servicio guardias",
        vigente: true,
        creadoPorId: usuario,
      },
    });
    cotizacionId = cot.id;
    await e.admin.cpqVersion.create({
      data: {
        tenantId,
        cotizacionId: cot.id,
        numero: 1,
        estado: "borrador",
        validaHasta: new Date("2026-12-15"),
        creadoPorId: usuario,
      },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("resuelve empresa, negocio y cotización para la plantilla", async () => {
    const negRow = await ctx(tenantId).db.negocio.findFirst({ where: { titulo: "Guardias ficticias" } });
    const r = await resolverCamposPropuesta(ctx(tenantId), {
      finalidad: "propuesta",
      cuentaId: negRow!.cuentaId!,
      cotizacionId,
    });
    expect(r.campos["empresa.nombre"]).toBe("Ficticia Seguridad");
    expect(r.campos["cuenta.nombre"]).toBe(cuentaNombre);
    expect(r.campos["negocio.titulo"]).toBe("Guardias ficticias");
    expect(r.campos["cotizacion.codigo"]).toBe("CPQ-571");
    expect(r.campos["cotizacion.valida_hasta"]).toBe("2026-12-15");
    const salida = htmlConValores(HTML, {
      campos: r.campos,
      colecciones: { instalaciones: r.colecciones.instalaciones, puestos: r.colecciones.puestos ?? [] },
    });
    expect(salida).toContain("Ficticia Seguridad");
    expect(salida).toContain(cuentaNombre);
    expect(salida).toContain("CPQ-571");
    expect(salida).not.toContain("{{");
    const render = renderizarPlantillaCampos(HTML, { campos: r.campos, colecciones: { puestos: r.colecciones.puestos ?? [] } }, { finalidad: "propuesta", html: true });
    expect(render.ok).toBe(true);
  });
});