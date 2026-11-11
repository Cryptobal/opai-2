// Monto en palabras para «SON … PESOS» (CAR-259). Puro y sin tildes, como se imprime en un DTE.

const UNIDADES = [
  "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE",
  "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUN", "VEINTIDOS",
  "VEINTITRES", "VEINTICUATRO", "VEINTICINCO", "VEINTISEIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE",
];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS",
  "OCHOCIENTOS", "NOVECIENTOS",
];

/** «UN» al final de la cifra se dice «UNO» (veintiuno, treinta y uno); delante de MIL o MILLONES queda «UN». */
const final = (s: string, esFinal: boolean) => (esFinal && s.endsWith("UN") ? `${s}O` : s);

function bajoMil(n: number, esFinal: boolean): string {
  const resto = n % 100;
  const centena = n === 100 ? "CIEN" : (CENTENAS[Math.floor(n / 100)] as string);
  const decena =
    resto < 30
      ? final(UNIDADES[resto] as string, esFinal)
      : `${DECENAS[Math.floor(resto / 10)] as string}${resto % 10 ? ` Y ${final(UNIDADES[resto % 10] as string, esFinal)}` : ""}`;
  return [centena, decena].filter(Boolean).join(" ");
}

function bajoMillon(n: number, esFinal: boolean): string {
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const milesTxt = miles === 0 ? "" : miles === 1 ? "MIL" : `${bajoMil(miles, false)} MIL`;
  return [milesTxt, resto ? bajoMil(resto, esFinal) : ""].filter(Boolean).join(" ");
}

/** 1.309.000 → «UN MILLON TRESCIENTOS NUEVE MIL». Enteros de hasta 999.999.999.999; redondea y ignora el signo. */
export function montoEnPalabras(monto: number): string {
  const n = Math.min(Math.abs(Math.round(monto)), 999_999_999_999);
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1_000_000);
  const resto = n % 1_000_000;
  const millonesTxt = millones === 0 ? "" : millones === 1 ? "UN MILLON" : `${bajoMillon(millones, false)} MILLONES`;
  return [millonesTxt, resto ? bajoMillon(resto, true) : ""].filter(Boolean).join(" ");
}
