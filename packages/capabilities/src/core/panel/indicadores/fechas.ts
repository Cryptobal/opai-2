/** Cortes del «facturado del mes»: del 1 al día de hoy, contra el mismo tramo del mes anterior. */
export type CorteMes = {
  /** Primer día del mes ("aaaa-mm-dd"). */
  desde: string;
  /** Día siguiente al corte, para acotar con `<` (exclusivo). */
  hastaExclusivo: string;
};

export type Cortes = { actual: CorteMes; anterior: CorteMes; periodo: string; dia: number };

const dos = (n: number) => String(n).padStart(2, "0");
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Corte del mes de `hoy` ("aaaa-mm-dd") y del mismo día del mes anterior (acotado a su largo). */
export function cortesDelMes(hoy: string): Cortes {
  const [a, m, d] = hoy.split("-").map(Number) as [number, number, number];
  const largoAnterior = new Date(Date.UTC(a, m - 1, 0)).getUTCDate();
  const diaAnterior = Math.min(d, largoAnterior);
  const anterior = new Date(Date.UTC(a, m - 2, 1));
  const aa = anterior.getUTCFullYear();
  const mm = anterior.getUTCMonth() + 1;
  return {
    periodo: `${a}-${dos(m)}`,
    dia: d,
    actual: {
      desde: `${a}-${dos(m)}-01`,
      hastaExclusivo: iso(Date.UTC(a, m - 1, d + 1)),
    },
    anterior: {
      desde: `${aa}-${dos(mm)}-01`,
      hastaExclusivo: iso(Date.UTC(aa, mm - 1, diaAnterior + 1)),
    },
  };
}

/** CLP mensual → UF escalada (`UF_ESCALA`), con la UF en centavos de CLP; mitad hacia arriba. */
export function clpAUfEscalada(clp: number, ufCentavos: bigint, escala: number): number {
  const num = BigInt(clp) * 100n * BigInt(escala);
  return Number((num * 2n + ufCentavos) / (2n * ufCentavos));
}
