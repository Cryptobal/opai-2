// CAR-374: ventas aún no emitidas por período (programaciones sin generar y borradores), base del % de ventas de los
// gastos recurrentes en meses abiertos. Datos sintéticos; Postgres real con un rol sin BYPASSRLS.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades as capacidadesFlujo } from "../../../modules/finanzas/capacidades";
import { ventasProgramadasPorPeriodo } from "../src";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

const urlPropietario = process.env.DATABASE_URL_TEST;
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
const mesActual = hoy.slice(0, 7);
const mesMas = (n: number) => {
  const t = Number(mesActual.slice(0, 4)) * 12 + Number(mesActual.slice(5, 7)) - 1 + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
};

describe.skipIf(!urlPropietario)("ventas programadas por período (CAR-374) · base real", () => {
  let s: VentasDbSuite;
  const hasta = `${mesMas(3)}-28`;
  const leer = (tid?: string) => ventasProgramadasPorPeriodo(s.ctx(tid), s.ctx(tid).db, hasta);

  beforeAll(async () => {
    s = await prepararVentasDb();
    // El flujo de caja vive en el módulo; sus capacidades se suman a las de ventas del paquete.
    s.mod.registrarCapacidades(capacidadesFlujo);
    // Afecta: 1.000.000 neto (el IVA no cuenta) y una exenta de 250.000, desde el mes que viene.
    for (const [tipoDte, precio, exento] of [[33, 1_000_000, false], [34, 250_000, true]] as const) {
      const p = await s.dato<{ id: string }>("finanzas.ventas_programacion.crear", {
        nombre: `Servicio ${tipoDte}`,
        cuentaId: s.cuentaId,
        tipoDte,
        frecuencia: "mensual",
        diaGeneracion: 1,
        plazoPagoDias: 30,
        fechaInicio: `${mesMas(1)}-01`,
        lineas: [{ glosa: "Servicio", cantidad: "1", precioUnitario: precio, exento }],
      });
      await s.dato("finanzas.ventas_programacion.cambiar_estado", { programacionId: p.id, activa: true });
    }
  }, 120_000);
  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("suma neto + exento de cada mes programado, sin IVA", async () => {
    const m = await leer();
    expect(m.get(mesMas(1))).toBe(1_250_000);
    expect(m.get(mesMas(2))).toBe(1_250_000);
  });

  it("los borradores cuentan en su mes y la nota de crédito en borrador resta", async () => {
    const antes = (await leer()).get(mesActual) ?? 0;
    const doc = (tipoDte: number, neto: number, dia: string | null = hoy) =>
      s.e.admin.documentoEmitido.create({
        data: { tenantId: s.tenantId, cuentaId: s.cuentaId, tipoDte, estadoDte: "borrador", fechaEmision: dia ? new Date(`${dia}T00:00:00Z`) : null, montoNeto: neto, montoIva: 0, montoTotal: neto },
      });
    await doc(33, 300_000);
    await doc(61, 100_000);
    // Un borrador atrasado (mes pasado) o sin fecha se emitirá ahora: cuenta en el mes en curso.
    await doc(33, 50_000, `${mesMas(-1)}-10`);
    await doc(34, 25_000, null);
    expect(((await leer()).get(mesActual) ?? 0) - antes).toBe(275_000);
  });

  it("la cuota de un retiro en % de ventas usa lo programado del mes anterior", async () => {
    const fila = (await s.dato<{ id: string }>("finanzas.filas.crear", { seccion: "egreso", etiqueta: "Retiro QA" })).id;
    const cuota = `${mesMas(2)}-05`;
    await s.dato("finanzas.recurrentes.crear", { filaId: fila, concepto: "Retiro 10%", unidad: "pct_ventas", monto: 100_000, frecuencia: "mensual", diaDelMes: 5, inicio: cuota, repeticiones: 1 });
    const lunes = await s.dato<{ semanas: string[]; celdas: { filaId: string; monto: number; nota: string | null }[] }>("finanzas.planilla.obtener", { semanas: 16 }); // la ventana por defecto parte 4 semanas atrás (CAR-391)
    const c = lunes.celdas.find((x) => x.filaId === fila);
    // 10 % de 1.250.000.
    expect(c?.monto).toBe(125_000);
    expect(c?.nota).toContain(`programado para ${mesMas(1)}`);
  });

  it("aislamiento: otra empresa no ve lo programado de esta", async () => {
    const otra = await leer(s.tenantB);
    expect(otra.get(mesMas(1)) ?? 0).toBe(0);
  });
});
