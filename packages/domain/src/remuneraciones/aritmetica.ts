import { redondearRazonCLP, type CLP } from "../dinero";

export function entero(n: number, nombre: string, minimo = 0, maximo = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(n) || n < minimo || n > maximo) throw new RangeError(`${nombre} fuera de rango`);
  return n;
}

/** Cociente exacto, mitad hacia arriba como redondearCLP; sin productos float. */
export function razonClp(numeradores: readonly number[], denominadores: readonly number[]): CLP {
  const producto = (ns: readonly number[], minimo: number) =>
    ns.reduce((p, n) => p * BigInt(entero(n, "Factor", minimo)), 1n);
  const n = producto(numeradores, 0);
  const d = producto(denominadores, 1);
  return cocienteClp(n, d);
}

export function cocienteClp(n: bigint, d: bigint): CLP {
  if (n < 0n || d <= 0n) throw new RangeError("Cociente inválido");
  return redondearRazonCLP(n, d);
}

export function fechaValida(fecha: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) ||
      new Date(fecha).toISOString().slice(0, 10) !== fecha) throw new RangeError("Fecha inválida");
}

export function congelar<T>(valor: T): T {
  if (valor && typeof valor === "object") {
    for (const hijo of Object.values(valor)) congelar(hijo);
    Object.freeze(valor);
  }
  return valor;
}
