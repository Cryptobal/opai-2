// Lecturas de Finanzas para agentes (BRIEF bot operativo): resultado por mes y búsqueda de ventas.
import { beforeAll, describe, expect, it } from "vitest";

import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { capacidadesFinanzas } from "../src/finanzas";
import { periodosEntre, ranking, resultadoPorMes } from "../src/finanzas/resultados-calculo";
import { rutNormalizado } from "../src/finanzas/ventas-buscar";

const C1 = "0192f3a0-0000-7000-8000-0000000000c1";
const C2 = "0192f3a0-0000-7000-8000-0000000000c2";
const P1 = "0192f3a0-0000-7000-8000-0000000000d1";
const f = (s: string) => new Date(`${s}T00:00:00.000Z`);
let n = 0;
const emitido = (x: Record<string, unknown>) => ({
  id: `0192f3a0-0000-7000-8000-00000000e${String(++n).padStart(3, "0")}`,
  tenantId: TENANT_DE_PRUEBA,
  cuentaId: C1,
  tipoDte: 33,
  estadoDte: "aceptado",
  estadoCobro: "pendiente",
  montoNeto: 1000,
  montoExento: 0,
  montoIva: 190,
  montoOtros: 0,
  montoTotal: 1190,
  montoCobrado: 0,
  instalacionId: null,
  cotizacionId: null,
  glosa: null,
  trackIdSii: null,
  documentoReferenciaId: null,
  cesionEstado: null,
  cesionProveedor: null,
  fechaVencimiento: null,
  ...x,
});

function ctxFin(extra: Record<string, unknown[]> = {}) {
  return contextoDePrueba({
    rol: null,
    permisosRol: ["finanzas:read"],
    modulosActivos: ["finanzas"],
    semilla: {
      cuenta: [
        { id: C1, tenantId: TENANT_DE_PRUEBA, nombre: "Minera Norte", rut: "76543210-3" },
        { id: C2, tenantId: TENANT_DE_PRUEBA, nombre: "Retail Sur", rut: "77111222-K" },
      ],
      proveedor: [
        { id: P1, tenantId: TENANT_DE_PRUEBA, razonSocial: "Uniformes SpA", rut: "76000111-2" },
      ],
      documentoEmitido: [
        emitido({
          folio: 10,
          fechaEmision: f("2026-09-10"),
          montoNeto: 1_000_000,
          montoTotal: 1_190_000,
        }),
        emitido({
          folio: 11,
          fechaEmision: f("2026-10-05"),
          montoNeto: 500_000,
          montoTotal: 595_000,
          cuentaId: C2,
          estadoCobro: "cedida",
          cesionEstado: "cedido",
        }),
        emitido({
          folio: 12,
          tipoDte: 61,
          fechaEmision: f("2026-10-20"),
          montoNeto: 100_000,
          montoTotal: 119_000,
        }),
        emitido({
          folio: 13,
          estadoDte: "borrador",
          fechaEmision: f("2026-10-21"),
          montoNeto: 999_999,
        }),
      ],
      documentoRecibido: [
        {
          id: "0192f3a0-0000-7000-8000-00000000f001",
          tenantId: TENANT_DE_PRUEBA,
          proveedorId: P1,
          tipoDte: 33,
          folio: 1,
          fechaEmision: f("2026-10-02"),
          fechaRecepcion: f("2026-10-03"),
          montoNeto: 300_000,
          montoExento: 0,
          montoTotal: 357_000,
        },
      ],
      ...extra,
    },
  });
}

beforeAll(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesFinanzas);
});

describe("finanzas · resultado por mes (cálculo puro)", () => {
  it("lista meses de borde a borde y cruza el año", () => {
    expect(periodosEntre("2026-11", "2027-02")).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
    expect(periodosEntre("2026-12", "2026-11")).toEqual([]);
  });

  it("las notas de crédito restan, el exento suma y el ranking es estable", () => {
    const docs = [
      { tipoDte: 33, fecha: "2026-10-05", montoNeto: 100, montoExento: 50, contraparteId: "a" },
      { tipoDte: 61, fecha: "2026-10-06", montoNeto: 30, montoExento: 0, contraparteId: "a" },
      { tipoDte: 34, fecha: "2026-10-07", montoNeto: 0, montoExento: 130, contraparteId: "b" },
    ];
    const [m] = resultadoPorMes(["2026-10"], docs, []);
    expect(m).toMatchObject({
      ventasClp: 250,
      comprasClp: 0,
      resultadoClp: 250,
      ventasDocumentos: 3,
    });
    expect(ranking(docs, 1)).toEqual([{ id: "b", montoClp: 130 }]);
  });
});

describe("finanzas.reportes.resultados", () => {
  it("ventas sin borradores menos compras, por mes, con rankings y nombres", async () => {
    const { ctx } = ctxFin();
    const r = await executeCapability(ctx, "finanzas.reportes.resultados", {
      desde: "2026-09",
      hasta: "2026-10",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const d = r.data as {
      meses: { periodo: string; ventasClp: number; comprasClp: number; resultadoClp: number }[];
      totales: { resultadoClp: number };
      topClientes: { nombre: string; montoClp: number }[];
      topProveedores: { nombre: string }[];
    };
    expect(d.meses).toEqual([
      expect.objectContaining({ periodo: "2026-09", ventasClp: 1_000_000, comprasClp: 0 }),
      expect.objectContaining({
        periodo: "2026-10",
        ventasClp: 400_000,
        comprasClp: 300_000,
        resultadoClp: 100_000,
      }),
    ]);
    expect(d.totales.resultadoClp).toBe(1_100_000);
    expect(d.topClientes[0]).toMatchObject({ nombre: "Minera Norte", montoClp: 900_000 });
    expect(d.topProveedores[0]?.nombre).toBe("Uniformes SpA");
  });

  it("rechaza rangos invertidos o de más de 24 meses", async () => {
    const { ctx } = ctxFin();
    for (const rango of [
      { desde: "2026-10", hasta: "2026-09" },
      { desde: "2024-01", hasta: "2026-10" },
    ]) {
      expect(await executeCapability(ctx, "finanzas.reportes.resultados", rango)).toMatchObject({
        ok: false,
        error: { code: "UNPROCESSABLE" },
      });
    }
  });

  it("exige finanzas:read", async () => {
    const { ctx } = contextoDePrueba({ rol: null, permisosRol: [], modulosActivos: ["finanzas"] });
    expect(await executeCapability(ctx, "finanzas.reportes.resultados", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

describe("finanzas.ventas.buscar", () => {
  const buscar = async (input: Record<string, unknown>) => {
    const { ctx } = ctxFin();
    const r = await executeCapability(ctx, "finanzas.ventas.buscar", input);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return (r.data as { items: { folio: number }[] }).items.map((i) => i.folio).sort();
  };

  it("normaliza el RUT y filtra por cliente", async () => {
    expect(rutNormalizado(" 76.543.210-3 ")).toBe("76543210-3");
    expect(rutNormalizado("765432103")).toBe("76543210-3");
    expect(rutNormalizado("76.543")).toBe("76543");
    expect(await buscar({ rut: "76.543.210-3" })).toEqual([10, 12, 13]);
    expect(await buscar({ rut: "99.999.999-9" })).toEqual([]);
    expect(await buscar({ rut: "76.543.210-3", cuentaId: C2 })).toEqual([]);
  });

  it("filtra por cesión, tipo, estado, fechas y rango de monto", async () => {
    expect(await buscar({ cesionEstado: "cedido" })).toEqual([11]);
    expect(await buscar({ tipoDte: 61 })).toEqual([12]);
    expect(await buscar({ estadoDte: "borrador" })).toEqual([13]);
    expect(await buscar({ emitidaDesde: "2026-10-01", emitidaHasta: "2026-10-05" })).toEqual([11]);
    expect(await buscar({ montoMin: 500_000, montoMax: 1_200_000 })).toEqual([10, 11]);
    expect(await buscar({ folio: 10 })).toEqual([10]);
  });
});
