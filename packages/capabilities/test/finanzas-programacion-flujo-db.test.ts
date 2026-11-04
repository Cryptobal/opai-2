// Proyección en el flujo de caja de las programaciones recurrentes, sin doble conteo (BRIEF-26 · CAR-159).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

const urlPropietario = process.env.DATABASE_URL_TEST;
const mesActual = new Date().toISOString().slice(0, 7);

type Item = {
  documentoEmitidoId: string | null;
  programacionId?: string | null;
  monto: number;
  capa: string;
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
});
