// Proyección en el flujo de caja de las programaciones recurrentes, sin doble conteo (BRIEF-26 · CAR-159).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cafXmlSintetico } from "./finanzas-caf-fixture";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

const urlPropietario = process.env.DATABASE_URL_TEST;
// Mes en hora de Chile: la proyección usa la fecha de Chile, no la de UTC (cambio de mes).
const mesActual = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date()).slice(0, 7);

type Item = {
  documentoEmitidoId: string | null;
  programacionId?: string | null;
  monto: number;
  capa: string;
  etiqueta?: string;
};

describe.skipIf(!urlPropietario)("programaciones en el flujo de caja · base real", () => {
  let s: VentasDbSuite;
  let progId = "";

  beforeAll(async () => {
    s = await prepararVentasDb();
    const p = await s.dato<{ id: string }>("finanzas.ventas_programacion.crear", {
      nombre: "Servicio flujo",
      cuentaId: s.cuentaId,
      tipoDte: 34,
      frecuencia: "mensual",
      diaGeneracion: 1,
      plazoPagoDias: 60,
      fechaInicio: `${mesActual}-01`,
      lineas: [{ glosa: "Servicio exento", cantidad: "1", precioUnitario: 250_000, exento: true }],
    });
    progId = p.id;
    await s.dato("finanzas.ventas_programacion.cambiar_estado", {
      programacionId: progId,
      activa: true,
    });
  }, 120_000);
  afterAll(async () => {
    await s?.e.cerrar();
  });

  const proyeccion = async () =>
    (await s.dato<{ items: Item[] }>("finanzas.ventas.proyeccion_flujo", { semanas: 52 })).items;

  it("una programación activa aparece como ingreso comprometido", async () => {
    const items = await proyeccion();
    const deProg = items.filter((i) => i.programacionId === progId);
    expect(deProg.length).toBeGreaterThan(0);
    expect(deProg.every((i) => i.capa === "comprometido" && i.monto === 250_000)).toBe(true);
  });

  it("al generar el borrador, el período deja de contarse dos veces", async () => {
    const antes = await proyeccion();
    const r = await s.dato<{ resultados: { documentoId: string | null; estado: string }[] }>(
      "finanzas.ventas_programacion.generar",
      { programacionId: progId },
    );
    const docId = r.resultados.find((x) => x.estado === "generado")?.documentoId;
    const despues = await proyeccion();
    const total = (xs: Item[]) => xs.reduce((a, i) => a + i.monto, 0);
    if (docId) {
      expect(despues.some((i) => i.documentoEmitidoId === docId)).toBe(true);
      // El período generado sale de la programación y entra como borrador: el total no cambia.
      expect(total(despues)).toBe(total(antes));
    }
  });
  it("CAR-184 · con la factura del período ya emitida, la proyección no se cuenta dos veces", async () => {
    // Una programación propia, para no depender de lo que generó el test anterior.
    const p = await s.dato<{ id: string }>("finanzas.ventas_programacion.crear", {
      nombre: "Servicio emitido",
      cuentaId: s.cuentaId,
      tipoDte: 34,
      frecuencia: "mensual",
      diaGeneracion: 1,
      plazoPagoDias: 45,
      fechaInicio: `${mesActual}-01`,
      lineas: [{ glosa: "Servicio exento emitido", cantidad: "1", precioUnitario: 400_000, exento: true }],
    });
    await s.dato("finanzas.ventas_programacion.cambiar_estado", { programacionId: p.id, activa: true });
    await s.dato("finanzas.folios.cargar_caf", {
      cafXml: cafXmlSintetico({ tipoDte: 34, folioDesde: 6000, folioHasta: 6020 }),
    });
    const deEsta = (xs: Item[]) => xs.filter((i) => i.programacionId === p.id);
    const total = (xs: Item[]) => xs.reduce((a, i) => a + i.monto, 0);

    const antes = await proyeccion();
    expect(deEsta(antes).length).toBeGreaterThan(0);

    const r = await s.dato<{ resultados: { documentoId: string | null; estado: string }[] }>(
      "finanzas.ventas_programacion.generar",
      { programacionId: p.id },
    );
    const docId = r.resultados.find((x) => x.estado === "generado")?.documentoId;
    expect(docId).toBeTruthy();
    const corrida = await s.e.admin.ventasProgramacionCorrida.findFirstOrThrow({
      where: { programacionId: p.id, documentoId: docId! },
    });

    await s.dato("finanzas.ventas.emitir", { documentoId: docId });
    const emitido = await s.e.admin.documentoEmitido.findFirstOrThrow({ where: { id: docId! } });
    expect(emitido.estadoDte).not.toBe("borrador");

    const despues = await proyeccion();
    // La factura emitida entra una sola vez, con su monto real.
    const facturas = despues.filter((i) => i.documentoEmitidoId === docId);
    expect(facturas).toHaveLength(1);
    expect(facturas[0]?.monto).toBe(400_000);
    // Y la proyección de ese período ya no existe.
    expect(deEsta(despues).some((i) => i.etiqueta?.endsWith(corrida.periodo))).toBe(false);
    // Nada se duplicó ni se perdió: el total del flujo no cambia.
    expect(total(despues)).toBe(total(antes));
  });
});
