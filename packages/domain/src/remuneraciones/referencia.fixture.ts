// Solo datos de prueba, nunca seed ni valores de respaldo. Fuentes/vigencias: brief M1.
import type { EntradaCostoEmpleador } from "./contrato";
import { CLAVES_INDICADORES, type DatosIndicadores, type Indicador, type ValorIndicador } from "./indicadores";
import { juegoDeValores } from "./valores";
import { FUENTES_REFERENCIA } from "./fuentes.fixture";

export const REFERENCIA: DatosIndicadores = {
  uf: 4_123_701, utm: 72_151, imm: 553_553,
  topes: { pensionSaludUf: 900_000, ipsUf: 600_000, cesantiaUf: 1_352_000, indemnizacionUf: 900_000 },
  afp: { obligatoria: 100_000, salud: 70_000,
    comisiones: { uno: 4_600, modelo: 5_800, planvital: 11_600, habitat: 12_700, capital: 14_400, cuprum: 14_400, provida: 14_500 } },
  sis: 17_800, reforma: { tasa: 35_000, incluyeSis: true },
  cesantia: { indefinidoEmpleador: 24_000, plazoFijoEmpleador: 30_000, indefinidoTrabajador: 6_000 },
  mutual: { basica: 9_000, sanna: 300 }, jornada: 42,
  impuesto: [
    { hastaUtm: 135_000, tasa: 0, rebajaUtm: 0 },
    { hastaUtm: 300_000, tasa: 40_000, rebajaUtm: 5_400 },
    { hastaUtm: 500_000, tasa: 80_000, rebajaUtm: 17_400 },
    { hastaUtm: 700_000, tasa: 135_000, rebajaUtm: 44_900 },
    { hastaUtm: 900_000, tasa: 230_000, rebajaUtm: 111_400 },
    { hastaUtm: 1_200_000, tasa: 304_000, rebajaUtm: 178_000 },
    { hastaUtm: 3_100_000, tasa: 350_000, rebajaUtm: 233_200 },
    { hastaUtm: null, tasa: 400_000, rebajaUtm: 388_200 },
  ],
};
const DESDE: Record<Indicador, string> = {
  uf: "2026-10-29", utm: "2026-10-01", imm: "2026-05-01", topes: "2026-02-01",
  afp: "2026-08-01", sis: "2026-08-01", reforma: "2026-08-01", cesantia: "2026-01-01",
  mutual: "2026-01-01", jornada: "2026-04-26", impuesto: "2026-01-01",
};
export function publicacionesReferencia(): ValorIndicador[] {
  // La relación clave/valor está garantizada por DatosIndicadores, incluso para objetos.
  return CLAVES_INDICADORES.map((indicador) => ({ indicador, valor: structuredClone(REFERENCIA[indicador]),
    vigenteDesde: DESDE[indicador], ...FUENTES_REFERENCIA[indicador], estado: "vigente" })) as ValorIndicador[];
}
export const juegoReferencia = () => juegoDeValores("2026-10-29", publicacionesReferencia());

export function entradaReferencia(base = 553_553, colacion = 0, movilizacion = 0): EntradaCostoEmpleador {
  return {
    sueldo: { sueldoBaseClp: base, gratificacion: "legal_25", colacionClp: colacion,
      movilizacionClp: movilizacion, haberes: [] },
    contrato: "indefinido", afp: "modelo", salud: { tipo: "fonasa" },
    jornadaMinutosSemanales: base === 237_237 ? 18 * 60 : 42 * 60,
    mutualAdicional: 2_700, // Hipótesis: adicional 0,27 % + básica 0,90 % + SANNA 0,03 % = total GC 1,20 %.
    // Hipótesis de prueba, NO decisión de Carlos: 21 corridos; base sin gratificación.
    provisiones: { diasVacacionesCorridosAnuales: 21, baseVacaciones: "sin_gratificacion",
      baseIndemnizacion: "imponible", mesesAntiguedad: 0, probabilidadIndemnizacion: 1_000_000 },
  };
}

// Etiquetas y números solamente; 1.0 es referencia, no verdad legal.
export const CASOS_GC = [
  { caso: "GC-A", base: 553_553, colacion: 20_000, movilizacion: 20_000, costo: 878_671, liquido: 606_148 },
  { caso: "GC-B", base: 553_553, colacion: 0, movilizacion: 0, costo: 833_673, liquido: 566_148 },
  { caso: "GC-C", base: 553_553, colacion: 220_000, movilizacion: 220_000, costo: 1_328_655, liquido: 1_006_148 },
  { caso: "GC-D", base: 237_237, colacion: 40_000, movilizacion: 40_000, costo: 447_285, liquido: 322_635 },
  { caso: "GC-E", base: 900_000, colacion: 0, movilizacion: 0, costo: 1_348_345, liquido: 915_661 },
  { caso: "GC-F", base: 1_000_000, colacion: 0, movilizacion: 0, costo: 1_468_829, liquido: 995_172 },
] as const;
export const CASOS_CR = [
  { caso: "CR-A", base: 700_000, costo: 1_054_228, liquido: 715_925 },
  { caso: "CR-A", base: 750_000, costo: 1_129_530, liquido: 767_063 },
  { caso: "CR-A", base: 950_000, costo: 1_408_587, liquido: 955_898 },
  { caso: "CR-B", base: 1_200_000, costo: 1_709_795, liquido: 1_152_266 },
  { caso: "CR-C", base: 650_000, costo: 978_926, liquido: 664_788 },
  { caso: "CR-E", base: 650_000, costo: 978_926, liquido: 664_788 },
] as const;
