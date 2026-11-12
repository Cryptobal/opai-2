// CAR-301: la búsqueda global incluye negocios y solicitudes de Comercial, con su permiso y sin cruzar tenants.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { buscadoresCpq } from "../../../modules/cpq/buscador";
import type * as Mod from "../src";

describe.skipIf(!urlPropietario)("core.buscar · aportes de Comercial (CAR-301)", () => {
  let e: Entorno, mod: typeof Mod;
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial"], medidor });
  async function dato<T>(tenantId: string, id: string, input: unknown) {
    const r = await mod.executeCapability(ctx(tenantId), id, input, {});
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  async function empresa(nombre: string) {
    const t = await e.admin.tenant.create({ data: { slug: `bus-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const cuenta = await dato<{ id: string }>(t.id, "core.cuentas.create", { nombre });
    const negocio = await dato<{ id: string }>(t.id, "comercial.negocios.create", { cuentaId: cuenta.id, titulo: "Guardias Zafiro norte" });
    const solicitud = await dato<{ id: string }>(t.id, "comercial.solicitudes.create", { textoOriginal: "Necesito guardias", asunto: "Cotizar Zafiro", empresa: "Zafiro SpA" });
    return { tenantId: t.id, negocioId: negocio.id, solicitudId: solicitud.id };
  }
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
    mod.registrarBuscadores([...mod.buscadoresComercial, ...buscadoresCpq]);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("encuentra negocios y solicitudes de la empresa, no los de otra", async () => {
    const a = await empresa("Alfa");
    const b = await empresa("Beta");
    const r = await mod.executeCapability(ctx(a.tenantId), "core.buscar", { q: "Zafiro" }, {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const otros = (r.data as { otros: { grupo: string; items: { id: string; href: string }[] }[] }).otros;
    expect(otros.map((g) => g.grupo).sort()).toEqual(["negocios", "solicitudes"]);
    expect(otros.find((g) => g.grupo === "negocios")?.items).toEqual([expect.objectContaining({ id: a.negocioId, href: `/negocios/${a.negocioId}` })]);
    expect(otros.find((g) => g.grupo === "solicitudes")?.items).toEqual([expect.objectContaining({ id: a.solicitudId, href: `/solicitudes/${a.solicitudId}` })]);
    expect(JSON.stringify(r)).not.toContain(b.negocioId);
    expect(JSON.stringify(r)).not.toContain(b.solicitudId);
  });

  it("sin el permiso de cada grupo no aparece", async () => {
    const a = await empresa("Gamma");
    const sin = (permiso: string) => {
      const c = ctx(a.tenantId);
      const base = c.autorizar;
      c.autorizar = (p: string) => p !== permiso && base(p);
      return c;
    };
    const grupos = async (c: ReturnType<typeof ctx>) => {
      const r = await mod.executeCapability(c, "core.buscar", { q: "Zafiro" }, {});
      return r.ok ? (r.data as { otros: { grupo: string }[] }).otros.map((g) => g.grupo) : [];
    };
    expect(await grupos(sin("comercial:negocios.read"))).toEqual(["solicitudes"]);
    expect(await grupos(sin("comercial:solicitudes.read"))).toEqual(["negocios"]);
  });

  it("encuentra cotizaciones por código o título, sin archivadas ni de otra empresa (cpq)", async () => {
    const autor = randomUUID();
    await e.admin.user.create({ data: { id: autor, email: `u-${autor.slice(0, 8)}@bus.test`, name: "Ana", emailVerified: true } });
    const a = await empresa("Delta");
    const b = await empresa("Epsilon");
    const crear = (t: { tenantId: string; negocioId: string }, codigo: string, extra: object = {}) =>
      e.admin.cpqCotizacion.create({ data: { tenantId: t.tenantId, negocioId: t.negocioId, codigo, titulo: "Servicio Zafiro", creadoPorId: autor, ...extra } });
    const viva = await crear(a, "COT-9001");
    await crear(a, "COT-9002", { archivadaEn: new Date() });
    const ajena = await crear(b, "COT-9003");
    const r = await mod.executeCapability(ctx(a.tenantId), "core.buscar", { q: "Zafiro" }, {});
    const grupos = r.ok ? (r.data as { otros: { grupo: string; items: { id: string }[] }[] }).otros : [];
    expect(grupos.find((g) => g.grupo === "cotizaciones")?.items.map((i) => i.id)).toEqual([viva.id]);
    const porCodigo = await mod.executeCapability(ctx(a.tenantId), "core.buscar", { q: "COT-9001" }, {});
    expect(JSON.stringify(porCodigo)).toContain(viva.id);
    expect(JSON.stringify(r)).not.toContain(ajena.id);
  });
});
