// CAR-526: facturas (DTE) y documentos en ⌘K / `core.buscar`, con permiso y módulo. Solo datos ficticios.
import { beforeEach, describe, expect, it } from "vitest";

import { manifest as manifestFinanzas } from "../../../modules/finanzas/manifest";
import { capacidadesDelNucleo, executeCapability, limpiarRegistro, registrarCapacidades, registrarModulos } from "../src";
import { limpiarBuscadores } from "../src/core/maestros/buscadores";
import { TENANT_DE_PRUEBA as T, contextoDePrueba } from "../src/testing";

const C = "0192f3a0-0000-7000-8000-0000000000c1";
const F = "0192f3a0-0000-7000-8000-0000000000f1";
const D = "0192f3a0-0000-7000-8000-0000000000d1";

const semilla = {
  tenant: [{ id: T, slug: "qa-car526", nombre: "QA CAR-526", vertical: "seguridad", timezone: "America/Santiago", estado: "activo" }],
  cuenta: [{ id: C, tenantId: T, nombre: "Cliente Zafiro SpA", rut: "76543210-3", razonSocial: "Zafiro SpA", archivadaEn: null }],
  documentoEmitido: [
    {
      id: F,
      tenantId: T,
      cuentaId: C,
      tipoDte: 33,
      folio: 9001,
      montoTotal: 1_190_000,
      estadoDte: "aceptado",
      fechaEmision: new Date("2026-11-01"),
    },
  ],
  documento: [
    {
      id: D,
      tenantId: T,
      nombre: "contrato-zafiro.pdf",
      titulo: "Contrato Zafiro",
      mime: "application/pdf",
      tamano: 100,
      storageKey: "k-qa-526",
      estado: "disponible",
      etiquetas: ["zafiro"],
      createdAt: new Date("2026-11-01"),
    },
  ],
};

type Salida = { otros: { grupo: string; items: { id: string; titulo: string; detalle: string | null; href: string }[] }[] };

const como = (extra: { permisosRol?: string[]; modulosActivos?: string[] } = {}) =>
  contextoDePrueba({
    rol: "owner",
    portal: "erp",
    modulosActivos: extra.modulosActivos ?? ["finanzas"],
    ...(extra.permisosRol ? { permisosRol: extra.permisosRol } : {}),
    semilla,
  });

const otros = async (c: ReturnType<typeof como>, q: string) => {
  const r = await executeCapability(c.ctx, "core.buscar", { q });
  if (!r.ok) throw new Error(r.error.message);
  return (r.data as Salida).otros;
};

beforeEach(() => {
  limpiarRegistro();
  limpiarBuscadores();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([manifestFinanzas]);
});

describe("buscador facturas y documentos (CAR-526)", () => {
  it("encuentra factura por folio, cliente y monto, y documento por título", async () => {
    const porFolio = await otros(como(), "9001");
    expect(porFolio.find((g) => g.grupo === "facturas")?.items).toEqual([
      {
        id: F,
        titulo: "Factura electrónica 9001",
        detalle: "Zafiro SpA",
        href: `/finanzas/ventas/${F}`,
      },
    ]);
    const porCliente = await otros(como(), "Zafiro");
    expect(porCliente.find((g) => g.grupo === "facturas")?.items.map((i) => i.id)).toEqual([F]);
    expect(porCliente.find((g) => g.grupo === "documentos")?.items).toEqual([
      { id: D, titulo: "Contrato Zafiro", detalle: "contrato-zafiro.pdf", href: `/documentos?ver=${D}` },
    ]);
    expect((await otros(como(), "1190000")).find((g) => g.grupo === "facturas")?.items.map((i) => i.id)).toEqual([F]);
  });

  it("sin finanzas:read no hay facturas; sin documentos.read no hay documentos; sin módulo no hay facturas", async () => {
    expect((await otros(como({ permisosRol: ["core:documentos.read"] }), "Zafiro")).map((g) => g.grupo)).toEqual([
      "documentos",
    ]);
    expect((await otros(como({ permisosRol: ["finanzas:read"] }), "Zafiro")).map((g) => g.grupo)).toEqual(["facturas"]);
    expect((await otros(como({ modulosActivos: [] }), "9001")).map((g) => g.grupo)).not.toContain("facturas");
  });
});