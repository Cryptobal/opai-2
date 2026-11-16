// CAR-526: ⌘K encuentra facturas (DTE) y documentos, con permiso y sin cruzar tenants. Solo datos qa-*.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest as manifestFinanzas } from "../../../modules/finanzas/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as Mod from "../src";

type Grupo = { grupo: string; items: { id: string; titulo: string; detalle: string | null; href: string }[] };

describe.skipIf(omitirSuiteDb())("core.buscar · facturas y documentos (CAR-526)", () => {
  let e: Entorno, mod: typeof Mod;
  const t = { a: "", b: "" };
  const ids = { facturaA: "", facturaB: "", docA: "", docB: "", cuentaA: "" };
  const ctx = (tenantId: string, extra: { permisosRol?: string[]; modulosActivos?: string[] } = {}) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      modulosActivos: extra.modulosActivos ?? ["finanzas"],
      medidor: { registrar: async () => undefined },
      ...(extra.permisosRol ? { permisosRol: extra.permisosRol } : {}),
    });
  const grupos = async (c: ReturnType<typeof ctx>, q: string) => {
    const r = await mod.executeCapability(c, "core.buscar", { q }, {});
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return (r.data as { otros: Grupo[] }).otros;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos([manifestFinanzas]);
    const mk = async (slug: string) => {
      const tenant = await e.admin.tenant.create({
        data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" },
      });
      return tenant.id;
    };
    t.a = await mk("qa-busfac");
    t.b = await mk("qa-busfacb");
    ids.cuentaA = (await e.admin.cuenta.create({ data: { tenantId: t.a, nombre: "Cliente Zafiro SpA", rut: "76543210-3" } })).id;
    const cuentaB = (await e.admin.cuenta.create({ data: { tenantId: t.b, nombre: "Cliente Zafiro SpA", rut: "76543210-3" } })).id;
    ids.facturaA = (
      await e.admin.documentoEmitido.create({
        data: {
          tenantId: t.a,
          cuentaId: ids.cuentaA,
          tipoDte: 33,
          folio: 9001,
          montoNeto: 1_000_000,
          montoIva: 190_000,
          montoTotal: 1_190_000,
          estadoDte: "aceptado",
          fechaEmision: new Date("2026-11-01"),
        },
      })
    ).id;
    ids.facturaB = (
      await e.admin.documentoEmitido.create({
        data: {
          tenantId: t.b,
          cuentaId: cuentaB,
          tipoDte: 33,
          folio: 9001,
          montoNeto: 1_000_000,
          montoIva: 190_000,
          montoTotal: 1_190_000,
          estadoDte: "aceptado",
          fechaEmision: new Date("2026-11-01"),
        },
      })
    ).id;
    ids.docA = (
      await e.admin.documento.create({
        data: {
          tenantId: t.a,
          nombre: "contrato-zafiro.pdf",
          titulo: "Contrato Zafiro",
          mime: "application/pdf",
          tamano: 100,
          storageKey: `k-${randomUUID()}`,
          estado: "disponible",
          creadoPorTipo: "system",
        },
      })
    ).id;
    ids.docB = (
      await e.admin.documento.create({
        data: {
          tenantId: t.b,
          nombre: "contrato-zafiro.pdf",
          titulo: "Contrato Zafiro",
          mime: "application/pdf",
          tamano: 100,
          storageKey: `k-${randomUUID()}`,
          estado: "disponible",
          creadoPorTipo: "system",
        },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("encuentra factura por folio, cliente y monto, y documento por título; no cruza tenant", async () => {
    const porFolio = await grupos(ctx(t.a), "9001");
    expect(porFolio.find((g) => g.grupo === "facturas")?.items).toEqual([
      expect.objectContaining({ id: ids.facturaA, href: `/finanzas/ventas/${ids.facturaA}` }),
    ]);
    expect(JSON.stringify(porFolio)).not.toContain(ids.facturaB);

    const porCliente = await grupos(ctx(t.a), "Zafiro");
    expect(porCliente.find((g) => g.grupo === "facturas")?.items.map((i) => i.id)).toEqual([ids.facturaA]);
    expect(porCliente.find((g) => g.grupo === "documentos")?.items).toEqual([
      expect.objectContaining({ id: ids.docA, href: `/documentos?ver=${ids.docA}`, titulo: "Contrato Zafiro" }),
    ]);
    expect(JSON.stringify(porCliente)).not.toContain(ids.docB);

    const porMonto = await grupos(ctx(t.a), "1190000");
    expect(porMonto.find((g) => g.grupo === "facturas")?.items.map((i) => i.id)).toEqual([ids.facturaA]);
  });

  it("sin finanzas:read no aparecen facturas; sin documentos.read no aparecen documentos", async () => {
    const sinFinanzas = await grupos(ctx(t.a, { permisosRol: ["core:documentos.read", "core:cuentas.read"] }), "Zafiro");
    expect(sinFinanzas.map((g) => g.grupo)).not.toContain("facturas");
    expect(sinFinanzas.find((g) => g.grupo === "documentos")?.items.map((i) => i.id)).toEqual([ids.docA]);

    const sinDocs = await grupos(ctx(t.a, { permisosRol: ["finanzas:read"] }), "Zafiro");
    expect(sinDocs.map((g) => g.grupo)).toEqual(["facturas"]);
  });

  it("sin el módulo finanzas activo no busca facturas", async () => {
    const r = await grupos(ctx(t.a, { modulosActivos: [] }), "9001");
    expect(r.map((g) => g.grupo)).not.toContain("facturas");
  });
});
