// Fecha civil (en Chile) del solsticio de junio, de donde sale el Día Nacional de los Pueblos
// Indígenas (Ley 21.357: feriado el día del solsticio de invierno del hemisferio sur). Se calcula el
// instante del solsticio con el método de J. Meeus («Astronomical Algorithms», cap. 27) y se pasa a
// la hora de Chile continental en invierno (UTC−4, sin horario de verano en junio) para quedarse con
// el día civil. Lógica pura, sin tabla por año (CAR-79). La fecha exacta la fija cada año un decreto;
// por eso el llamador la marca «[por verificar]» para el contraste anual.

/** Términos periódicos de Meeus (A, B, C) para afinar el instante de los equinoccios/solsticios. */
const TERMINOS: readonly (readonly [number, number, number])[] = [
  [485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186],
  [182, 27.85, 445267.112], [156, 73.14, 45036.886], [136, 171.52, 22518.443],
  [77, 222.54, 65928.934], [74, 296.72, 3034.906], [70, 243.58, 9037.513],
  [58, 119.81, 33718.147], [52, 297.17, 150.678], [50, 21.02, 2281.226],
  [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417],
  [18, 155.12, 67555.328], [17, 288.79, 4562.452], [16, 198.04, 62894.029],
  [14, 199.76, 31436.921], [12, 95.39, 14577.848], [12, 287.11, 31931.756],
  [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074],
];

const rad = (g: number): number => (g * Math.PI) / 180;

/** Día Juliano (TT) del solsticio de junio del año (1000–3000), método de Meeus cap. 27. */
function jdeSolsticioJunio(anio: number): number {
  const y = (anio - 2000) / 1000;
  const jde0 =
    2451716.56767 + 365241.62603 * y + 0.00325 * y * y + 0.00888 * y ** 3 - 0.0003 * y ** 4;
  const t = (jde0 - 2451545.0) / 36525;
  const w = 35999.373 * t - 2.47;
  const dLambda = 1 + 0.0334 * Math.cos(rad(w)) + 0.0007 * Math.cos(rad(2 * w));
  const s = TERMINOS.reduce((acc, [a, b, c]) => acc + a * Math.cos(rad(b + c * t)), 0);
  return jde0 + (0.00001 * s) / dLambda;
}

/** Día Juliano → fecha/hora UTC (Meeus cap. 7). Devuelve [año, mes 1–12, día, horaDecimal]. */
function desdeJd(jd: number): [number, number, number, number] {
  const z = Math.floor(jd + 0.5);
  const fr = jd + 0.5 - z;
  const alpha = Math.floor((z - 1867216.25) / 36524.25);
  const a = z >= 2299161 ? z + 1 + alpha - Math.floor(alpha / 4) : z;
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const dia = b - d - Math.floor(30.6001 * e);
  const mes = e < 14 ? e - 1 : e - 13;
  const anio = mes > 2 ? c - 4716 : c - 4715;
  return [anio, mes, dia, fr * 24];
}

/** Fecha civil "aaaa-mm-dd" del solsticio de junio en Chile continental (UTC−4) del año. */
export function solsticioJunio(anio: number): string {
  const [y, m, d, hora] = desdeJd(jdeSolsticioJunio(anio));
  // El instante está en TT≈UTC (±1 min); pasamos a hora de Chile (UTC−4) para el día civil.
  const utc = new Date(Date.UTC(y, m - 1, d, Math.trunc(hora), Math.round((hora % 1) * 60)));
  const chile = new Date(utc.getTime() - 4 * 3600_000);
  return chile.toISOString().slice(0, 10);
}
