// Brief 10 · CPQ PR 10.1: contra Postgres real con un rol sin BYPASSRLS (si hay DATABASE_URL_TEST).
// Aislamiento entre dos empresas (RLS `tenant_isolation` de `cpq.*`): una cotización, un negocio o un
// cargo de otra empresa responden NOT_FOUND, igual que inexistentes (sin enumeración); y el
// correlativo CPQ-AAAA-NNN es atómico por tenant y año bajo creaciones concurrentes (R54).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Res = Awaited<ReturnType<Capacidades["executeCapability"]>>;

describe.skipIf(!urlPropietario)("CPQ contra Postgres (RLS y correlativo)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "" };
  const neg = { a: "", b: "" };
  const cargo = { a: "", b: "" };
  let cotB = "";
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor });
  const codigo = (r: Res) => (r.ok ? (r.data as { codigo: string }).codigo : `error ${JSON.stringify(r.error)}`);

  async function empresa(slug: string) {
    const tenantId = (await e.admin.tenant.create({ data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } })).id;
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta" } })).id;
    const instalacionId = (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre: `Planta ${slug}` } })).id;
    const embudoId = (await e.admin.embudo.create({ data: { tenantId, nombre: "Ventas", porDefecto: true } })).id;
    const etapaId = (await e.admin.etapa.create({ data: { tenantId, embudoId, nombre: "Prospecto" } })).id;
    const negocioId = (await e.admin.negocio.create({ data: { tenantId, cuentaId, embudoId, etapaId, titulo: `Negocio ${slug}` } })).id;
    await e.admin.negocioInstalacion.create({ data: { tenantId, negocioId, instalacionId } });
    const cargoId = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
    return { tenantId, negocioId, cargoId };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...mod.capacidadesCpq]);
    const a = await empresa("cpq-a");
    const b = await empresa("cpq-b");
    [t.a, neg.a, cargo.a] = [a.tenantId, a.negocioId, a.cargoId];
    [t.b, neg.b, cargo.b] = [b.tenantId, b.negocioId, b.cargoId];
    const r = await mod.executeCapability(ctx(t.b), "cpq.cotizaciones.create", { negocioId: neg.b });
    cotB = r.ok ? (r.data as { id: string }).id : "";
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("B ve su propia cotización (control)", async () => {
    const r = await mod.executeCapability(ctx(t.b), "cpq.cotizaciones.get", { id: cotB });
    expect(r.ok).toBe(true);
  });

  it("A no ve ni edita la cotización de B: NOT_FOUND con el mismo mensaje que una inexistente", async () => {
    const get = await mod.executeCapability(ctx(t.a), "cpq.cotizaciones.get", { id: cotB });
    const nada = await mod.executeCapability(ctx(t.a), "cpq.cotizaciones.get", { id: randomUUID() });
    const aj = await mod.executeCapability(ctx(t.a), "cpq.cotizaciones.ajustar", { id: cotB, operaciones: [{ op: "agregar_comun" }] });
    expect(get).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(aj).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(!get.ok && !nada.ok && get.error.message === nada.error.message).toBe(true);
    const l = await mod.executeCapability(ctx(t.a), "cpq.cotizaciones.list", {});
    expect(l.ok && (l.data as { items: { id: string }[] }).items.some((i) => i.id === cotB)).toBe(false);
  });

  it("A no cotiza el negocio de B ni usa su cargo", async () => {
    const r = await mod.executeCapability(ctx(t.a), "cpq.cotizaciones.create", { negocioId: neg.b });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const c = await mod.executeCapability(ctx(t.a), "cpq.cotizaciones.create", { negocioId: neg.a, comun: true });
    const d = c.ok ? (c.data as { id: string; secciones: { id: string }[] }) : { id: "", secciones: [] };
    const l = await mod.executeCapability(ctx(t.a), "cpq.cotizaciones.ajustar", {
      id: d.id,
      operaciones: [{ op: "agregar_linea", seccionId: d.secciones[0]?.id, tipo: "puesto", nombre: "G", cargoId: cargo.b }],
    });
    expect(l).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el correlativo es atómico: 6 creaciones concurrentes dan 6 números consecutivos sin repetir (R54)", async () => {
    const empresaC = await empresa("cpq-c");
    const rs = await Promise.all(
      Array.from({ length: 6 }, () => mod.executeCapability(ctx(empresaC.tenantId), "cpq.cotizaciones.create", { negocioId: empresaC.negocioId })),
    );
    const numeros = rs.map(codigo).map((c) => Number(c.split("-")[2])).sort((x, y) => x - y);
    expect(numeros).toEqual([1, 2, 3, 4, 5, 6]);
    const vigentes = await e.admin.cotizacion.count({ where: { tenantId: empresaC.tenantId, vigente: true } });
    expect(vigentes).toBe(1);
  });

  it("los correlativos son independientes por empresa", async () => {
    const r = await mod.executeCapability(ctx(t.a), "cpq.cotizaciones.create", { negocioId: neg.a, comun: true });
    expect(codigo(r)).toMatch(/^CPQ-\d{4}-00[12]$/);
  });
});
