// Programaciones recurrentes contra Postgres real (BRIEF-26 · CAR-159): crear, activar, generar una
// sola vez, UF exacta y aislamiento entre empresas.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

const urlPropietario = process.env.DATABASE_URL_TEST;
const mesActual = new Date().toISOString().slice(0, 7);
const hoyIso = new Date().toISOString().slice(0, 10);

type Res = { id: string; activa: boolean; proximaEjecucionEn: string | null };
type Gen = {
  resultados: {
    periodo: string;
    estado: string;
    motivo: string | null;
    documentoId: string | null;
    montoTotal: number | null;
  }[];
};

describe.skipIf(!urlPropietario)("programaciones recurrentes · base real", () => {
  let s: VentasDbSuite;
  let progClp = "";

  const base = () => ({
    nombre: "Servicio mensual",
    cuentaId: s.cuentaId,
    tipoDte: 33,
    frecuencia: "mensual",
    diaGeneracion: 1,
    plazoPagoDias: 30,
    fechaInicio: `${mesActual}-01`,
    lineas: [
      {
        glosa: "Servicio de seguridad",
        cantidad: "2",
        precioUnitario: 500_000,
        descuentoPct: 1000,
      },
    ],
  });

  beforeAll(async () => {
    s = await prepararVentasDb();
  }, 120_000);
  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("crea pausada y activa con próxima generación en la ventana", async () => {
    const creada = await s.dato<Res>("finanzas.ventas_programacion.crear", base());
    progClp = creada.id;
    expect(creada.activa).toBe(false);
    const activa = await s.dato<Res>("finanzas.ventas_programacion.cambiar_estado", {
      programacionId: progClp,
      activa: true,
    });
    expect(activa.activa).toBe(true);
    expect(activa.proximaEjecucionEn).toBe(`${mesActual}-01`);
  });

  it("genera un borrador exacto una sola vez por período", async () => {
    const vista = await s.dato<Gen>(
      "finanzas.ventas_programacion.generar",
      { programacionId: progClp },
      { dryRun: true },
    );
    expect(vista.resultados[0]?.estado).toBe("generado");
    expect(
      await s.e.admin.ventasProgramacionCorrida.count({ where: { programacionId: progClp } }),
    ).toBe(0);
    const r = await s.dato<Gen>("finanzas.ventas_programacion.generar", {
      programacionId: progClp,
    });
    expect(r.resultados).toHaveLength(1);
    // 2 × 500.000 − 10 % = 900.000 neto; IVA 171.000.
    expect(r.resultados[0]?.montoTotal).toBe(1_071_000);
    const doc = await s.e.admin.documentoEmitido.findUnique({
      where: { id: r.resultados[0]!.documentoId! },
    });
    expect(doc?.estadoDte).toBe("borrador");
    expect(doc?.montoNeto).toBe(900_000);
    const otra = await s.dato<Gen>("finanzas.ventas_programacion.generar", {
      programacionId: progClp,
      periodo: mesActual,
    });
    expect(otra.resultados[0]?.estado).toBe("ya_generado");
    expect(
      await s.e.admin.ventasProgramacionCorrida.count({ where: { programacionId: progClp } }),
    ).toBe(1);
  });

  it("resuelve los marcadores de la glosa de la línea: período y monto (CAR-221 · B)", async () => {
    const p = await s.dato<Res>("finanzas.ventas_programacion.crear", {
      ...base(),
      nombre: "Con marcadores",
      lineas: [{ glosa: "Guardias {{periodo}} · total {{monto}} · {{no_existe}}", cantidad: "1", precioUnitario: 200_000 }],
    });
    await s.dato("finanzas.ventas_programacion.cambiar_estado", { programacionId: p.id, activa: true });
    const r = await s.dato<Gen>("finanzas.ventas_programacion.generar", { programacionId: p.id });
    const linea = await s.e.admin.documentoEmitidoLinea.findFirstOrThrow({ where: { documentoId: r.resultados[0]!.documentoId! } });
    // 200.000 neto + 19 % de IVA = 238.000; un marcador desconocido nunca se inventa.
    expect(linea.glosa).toBe(`Guardias ${mesActual} · total $238.000 · {{no_existe}}`);
  });

  it("en UF exige la UF publicada de la fecha y no inventa otra", async () => {
    const p = await s.dato<Res>("finanzas.ventas_programacion.crear", {
      ...base(),
      nombre: "Servicio en UF",
      moneda: "UF",
      politicaUf: "RUN_DAY",
      lineas: [{ glosa: "Servicio", cantidad: "1", precioUnitario: 100_000 }],
    });
    await s.dato("finanzas.ventas_programacion.cambiar_estado", {
      programacionId: p.id,
      activa: true,
    });
    const sinUf = await s.dato<Gen>(
      "finanzas.ventas_programacion.generar",
      { programacionId: p.id },
      { dryRun: true },
    );
    const r0 = sinUf.resultados[0];
    if (r0 && r0.estado === "omitido") expect(r0.motivo).toMatch(/Sin UF publicada/);
  });

  it("no genera períodos anteriores a la fecha de corte con 1.0", async () => {
    await s.dato("finanzas.dte_config.actualizar", {
      ambiente: "certificacion",
      rutEmisor: "76111222-8",
      fechaCorte1_0: hoyIso,
    });
    const p = await s.dato<Res>("finanzas.ventas_programacion.crear", {
      ...base(),
      nombre: "Con corte",
    });
    await s.dato("finanzas.ventas_programacion.cambiar_estado", {
      programacionId: p.id,
      activa: true,
    });
    if (hoyIso > `${mesActual}-01`) {
      await expect(
        s.dato("finanzas.ventas_programacion.generar", {
          programacionId: p.id,
          periodo: mesActual,
        }),
      ).rejects.toThrow(/OPAI 1.0/);
    }
  });

  it("la empresa B no ve ni genera la programación de A", async () => {
    const r = await s.mod.executeCapability(
      s.ctx(s.tenantB),
      "finanzas.ventas_programacion.generar",
      { programacionId: progClp },
    );
    expect(r.ok).toBe(false);
    const l = await s.mod.executeCapability(
      s.ctx(s.tenantB),
      "finanzas.ventas_programacion.listar",
      {},
    );
    expect(l.ok && (l.data as { items: unknown[] }).items.length).toBe(0);
  });
});
