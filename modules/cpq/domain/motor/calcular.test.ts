import { describe, expect, it } from "vitest";
import { calcular as motor } from "./calcular";
import { financieraPrueba, itemPrueba, modeloPrueba, parametrosPrueba, puestoPrueba, versionPrueba, proveedorPrueba } from "./fixtures";
import { resultadoSinCostos } from "./resultado";
const calcular: typeof motor = (v, m, p, proveedor = proveedorPrueba()) => motor(v, m, p, proveedor);

describe("motor puro CPQ", () => {
  it("costo empleador recibido por puerto ficticio; posiciones ≠ personas", async () => {
    const puesto = puestoPrueba({ posiciones: 2 });
    const porPersona = itemPrueba(1_000, { id: "persona" }); porPersona.item.modo = "por_persona_mes";
    const porPuesto = itemPrueba(1_000, { id: "posicion" }); porPuesto.item.modo = "por_puesto_mes";
    const r = calcular(versionPrueba([puesto, porPersona, porPuesto]), modeloPrueba(), parametrosPrueba);
    expect(r.dotacion).toEqual({ posiciones: 2, personasEscaladas: 40_000 });
    expect(r.lineas.map((l) => l.costoMensual)).toEqual([4_000_000, 73_333, 4_000, 2_000]);
    expect(r.directos).toBe(4_073_333); expect(r.indirectos).toBe(6_000);
    expect(r.secciones).toHaveLength(2);
  });
  it.each(["4x4", "7x7"])("%s 12h requiere 2 personas y sobrescribir exige motivo", (patron) => {
    const v = versionPrueba([puestoPrueba({ patron })]);
    expect(calcular(v, modeloPrueba(), parametrosPrueba).dotacion.personasEscaladas).toBe(20_000);
    const l = puestoPrueba({ personasPorPosicionEscaladas: 25_000 });
    expect(() => calcular(versionPrueba([l]), modeloPrueba(), parametrosPrueba)).toThrow("motivo");
    l.motivoPersonas = "Cobertura ficticia adicional";
    expect(calcular(versionPrueba([l]), modeloPrueba(), parametrosPrueba).traza[0]?.variables).toContainEqual(
      { clave: "motivoPersonas", ambito: "linea", valor: l.motivoPersonas });
  });
  it("R56/R64: mensual no se ratea, inversión toma catálogo o sobrescritura", () => {
    const mensual = itemPrueba(120_000); mensual.item.rateo = { tipo: "meses", meses: 12 };
    expect(calcular(versionPrueba([mensual]), modeloPrueba(), parametrosPrueba).costoMensual).toBe(120_000);
    const inversion = itemPrueba(120_000); inversion.item.modo = "inversion"; inversion.item.rateo = { tipo: "meses", meses: 12 };
    const v = versionPrueba([inversion]); v.meses = 3;
    expect(calcular(v, modeloPrueba(), parametrosPrueba).costoMensual).toBe(10_000);
    inversion.rateo = { tipo: "contrato" };
    expect(calcular(v, modeloPrueba(), parametrosPrueba).costoMensual).toBe(40_000);
    inversion.rateo = { tipo: "unico" };
    const r = calcular(v, modeloPrueba(), parametrosPrueba);
    expect(r.costoMensual).toBe(0); expect(r.pagosUnicos).toBe(120_000);
    expect(inversion.item.rateo).toEqual({ tipo: "meses", meses: 12 });
  });
  it("R31/R32: modos construidos a mano, adicionales fuera del margen general", () => {
    const m = modeloPrueba(); m.valores = { feriados_anuales: 0 };
    const adicional = itemPrueba(80_000, { tipo: "adicional", id: "adicional", margenPct: 200_000 });
    const v = versionPrueba([puestoPrueba(), itemPrueba(200_000), adicional]);
    v.margenPct = 200_000;
    // MO=600.000, C=800.000, adicional=80.000/0,8=100.000.
    v.margenModo = "markup"; // 800.000*1,2 + 100.000 = 1.060.000
    expect(calcular(v, m, parametrosPrueba, proveedorPrueba(300_000)).ventaMensual).toBe(1_060_000);
    v.margenModo = "margen_sobre_mano_de_obra"; // 600.000/0,8 + 200.000 + 100.000 = 1.050.000
    expect(calcular(v, m, parametrosPrueba, proveedorPrueba(300_000)).ventaMensual).toBe(1_050_000);
    v.margenModo = "margen_sobre_venta"; // 800.000/0,8 + 100.000 = 1.100.000
    expect(calcular(v, m, parametrosPrueba, proveedorPrueba(300_000)).ventaMensual).toBe(1_100_000);
    v.margenPct = 1_000_000; // guarda de dominio, el borde no acepta 100%
    expect(calcular(v, m, parametrosPrueba, proveedorPrueba(300_000)).ventaMensual).toBe(900_000);
  });
  it("precio manual fija S y calcula margen/semáforo al revés", () => {
    const v = versionPrueba([itemPrueba(900_000)]); v.precioManualClp = 1_000_000;
    expect(calcular(v, modeloPrueba(), parametrosPrueba)).toMatchObject({ ventaMensual: 1_000_000, margenEfectivoPct: 100_000, semaforo: "amarillo" });
    v.precioManualClp = 950_000;
    expect(calcular(v, modeloPrueba(), parametrosPrueba)).toMatchObject({ semaforo: "rojo", requiereAprobacion: true });
  });
  it("UF faltante deja instrumento en cero, no enviable y proyección sin costos", () => {
    const v = versionPrueba([itemPrueba(100_000)]); const i = financieraPrueba();
    i.rc.habilitada = true; i.rc.primaAnualUf = 900_000; v.instrumentos = i;
    const r = calcular(v, modeloPrueba(), { ...parametrosPrueba, uf: null });
    expect(r.instrumentos.responsabilidad).toBe(0); expect(r.noEnviable).toBe(true);
    expect(resultadoSinCostos(r)).toEqual({ ventaMensual: 100_000, pagosUnicos: 0, dotacion: { posiciones: 0, personasEscaladas: 0 },
      uf: null, fecha: parametrosPrueba.fecha, estado: "borrador", advertencias: ["falta valor UF"], noEnviable: true });
  });
  it("semilla fija: venta entera, determinista y monótona para los tres modos", () => {
    let semilla = 133;
    const azar = () => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return semilla; };
    for (let i = 0; i < 100; i++) {
      const v = versionPrueba([puestoPrueba(), itemPrueba(azar() % 500_000)]);
      v.margenModo = (["markup", "margen_sobre_venta", "margen_sobre_mano_de_obra"] as const)[i % 3] ?? "markup";
      v.margenPct = azar() % 800_000;
      const r = calcular(v, modeloPrueba(), parametrosPrueba);
      expect(Number.isInteger(r.ventaMensual)).toBe(true);
      expect(calcular(v, modeloPrueba(), parametrosPrueba)).toEqual(r);
      expect(calcular({ ...v, margenPct: v.margenPct + 1_000 }, modeloPrueba(), parametrosPrueba).ventaMensual).toBeGreaterThanOrEqual(r.ventaMensual ?? 0);
    }
  });
});
