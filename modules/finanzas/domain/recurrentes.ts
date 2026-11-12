// Gastos recurrentes del flujo de caja (Sesión Caja, CAR-269). Puro: sin base de datos. A diferencia de OPAI 1,
// que copiaba cada regla a celdas de plan y un proceso las reescribía, aquí la regla se expande al leer (ADR-026):
// nada que rematerializar. Fechas «aaaa-mm-dd» (UTC), montos CLP enteros en positivo.

export type Frecuencia = "semanal" | "quincenal" | "mensual";

export type Recurrente = {
  frecuencia: Frecuencia;
  /** Solo mensual: 1 a 31 (se ajusta al último día de los meses cortos) o −1 = último día del mes. */
  diaDelMes: number | null;
  inicio: string;
  fin: string | null;
  /** Tope de ocurrencias desde el inicio; con `fin` también, termina en lo que ocurra primero. */
  repeticiones: number | null;
};

const DIA_MS = 86_400_000;
const aMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const aIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const diasDelMes = (a: number, m: number) => new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
const LIMITE = 1_200;

/** Todas las ocurrencias desde el inicio hasta `hasta`, respetando el fin y el tope de repeticiones. */
function todas(r: Recurrente, hasta: string): string[] {
  const corte = r.fin && r.fin < hasta ? r.fin : hasta;
  const tope = r.repeticiones && r.repeticiones > 0 ? r.repeticiones : LIMITE;
  const out: string[] = [];
  if (corte < r.inicio) return out;
  if (r.frecuencia === "mensual") {
    const ini = new Date(aMs(r.inicio));
    let a = ini.getUTCFullYear();
    let m = ini.getUTCMonth();
    const pedido = r.diaDelMes ?? ini.getUTCDate();
    for (let i = 0; i < LIMITE && out.length < tope; i += 1) {
      const dia = pedido === -1 ? diasDelMes(a, m) : Math.min(pedido, diasDelMes(a, m));
      const f = aIso(Date.UTC(a, m, dia));
      if (f > corte) break;
      if (f >= r.inicio) out.push(f);
      m += 1;
      if (m > 11) [a, m] = [a + 1, 0];
    }
    return out;
  }
  const paso = (r.frecuencia === "quincenal" ? 14 : 7) * DIA_MS;
  for (let t = aMs(r.inicio); aIso(t) <= corte && out.length < tope; t += paso) out.push(aIso(t));
  return out;
}

/** Ocurrencias dentro de [desde, hasta]. El tope de repeticiones se cuenta desde el inicio, no desde `desde`. */
export function ocurrenciasDe(r: Recurrente, desde: string, hasta: string): string[] {
  if (desde > hasta) return [];
  return todas(r, hasta).filter((f) => f >= desde);
}

export type CargoFila = { id: string; fecha: string; monto: number };
export type EstadoOcurrencia = {
  fecha: string;
  estado: "pagada" | "parcial" | "proyectada";
  /** Lo que falta pagar de la ocurrencia; es lo único que se proyecta. */
  pendiente: number;
  cargoId: string | null;
};

/**
 * Cruza las ocurrencias con los cargos conciliados a la fila del recurrente: un cargo dentro de la ventana de una
 * ocurrencia (días antes y después de su fecha) la paga, total o parcialmente. Cada cargo se usa una sola vez; se
 * prefiere el de monto exacto y, entre esos, el más cercano en fecha (varios recurrentes pueden compartir fila); dos cargos idénticos pagan dos ocurrencias distintas. Así no se cuenta dos veces
 * lo proyectado y lo real, sin dar nada por cumplido a mano.
 */
export function estadoOcurrencias(
  fechas: readonly string[],
  monto: number,
  cargos: readonly CargoFila[],
  ventana: { diasAntes: number; diasDespues: number },
): EstadoOcurrencia[] {
  const usados = new Set<string>();
  return [...fechas].sort().map((fecha) => {
    const t = aMs(fecha);
    const candidatos = cargos
      .filter((c) => !usados.has(c.id))
      .filter((c) => aMs(c.fecha) >= t - ventana.diasAntes * DIA_MS && aMs(c.fecha) <= t + ventana.diasDespues * DIA_MS)
      .sort((x, y) => Number(Math.abs(x.monto) !== monto) - Number(Math.abs(y.monto) !== monto) || Math.abs(aMs(x.fecha) - t) - Math.abs(aMs(y.fecha) - t) || x.id.localeCompare(y.id));
    const cargo = candidatos[0];
    if (!cargo) return { fecha, estado: "proyectada", pendiente: monto, cargoId: null };
    usados.add(cargo.id);
    const pendiente = Math.max(0, monto - Math.abs(cargo.monto));
    return { fecha, estado: pendiente === 0 ? "pagada" : "parcial", pendiente, cargoId: cargo.id };
  });
}
