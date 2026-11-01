// Fechas civiles "aaaa-mm-dd" de la pauta (sin hora ni zona). La pauta trabaja con días enteros; la
// zona del tenant solo decide qué día es «hoy» y se resuelve en el borde, no aquí.

const MS_DIA = 86_400_000;

/** Días desde 1970-01-01 de una fecha civil. */
export function diaNumero(fecha: string): number {
  return Math.floor(Date.parse(`${fecha}T00:00:00Z`) / MS_DIA);
}

export function fechaDeDia(n: number): string {
  return new Date(n * MS_DIA).toISOString().slice(0, 10);
}


/** 1 = lunes … 7 = domingo (igual que `diasSemana` del patrón). */
export function diaSemanaIso(fecha: string): number {
  const dow = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function diasDelMes(anio: number, mes: number): string[] {
  const total = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    return `${anio}-${String(mes).padStart(2, "0")}-${d}`;
  });
}

/** Rango inclusivo de fechas; vacío si `hasta` < `desde`. */
export function rangoDias(desde: string, hasta: string): string[] {
  const a = diaNumero(desde);
  const b = diaNumero(hasta);
  return Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => fechaDeDia(a + i));
}

/** "HH:mm" → minutos desde la medianoche. */
export function minutosDeHora(hora: string): number {
  const [h = "0", m = "0"] = hora.split(":");
  return Number(h) * 60 + Number(m);
}
