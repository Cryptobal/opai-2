import { redondearCLP } from "@opai/domain/dinero";

/** Aritmética racional entera: conserva la escala fina hasta el borde de cada monto. */
export class Numero {
  readonly n: bigint;
  readonly d: bigint;
  constructor(n: bigint | number, d: bigint | number = 1) {
    if (typeof n === "number" && !Number.isSafeInteger(n)) throw new RangeError("Entero inválido");
    if (typeof d === "number" && !Number.isSafeInteger(d)) throw new RangeError("Escala inválida");
    let a = BigInt(n), b = BigInt(d);
    if (!b) throw new RangeError("División por cero");
    if (b < 0n) { a = -a; b = -b; }
    let x = a < 0n ? -a : a, y = b;
    while (y) { const r = x % y; x = y; y = r; }
    this.n = a / (x || 1n); this.d = b / (x || 1n);
    if (this.n.toString(2).length > 1024 || this.d.toString(2).length > 1024)
      throw new RangeError("Cálculo fuera de límites");
  }
  mas(v: Numero): Numero { return new Numero(this.n * v.d + v.n * this.d, this.d * v.d); }
  menos(v: Numero): Numero { return this.mas(v.por(new Numero(-1))); }
  por(v: Numero): Numero { return new Numero(this.n * v.n, this.d * v.d); }
  div(v: Numero): Numero { return new Numero(this.n * v.d, this.d * v.n); }
  comparar(v: Numero): number { const r = this.n * v.d - v.n * this.d; return r < 0n ? -1 : r > 0n ? 1 : 0; }
  entero(): number {
    const a = this.n < 0n ? -this.n : this.n;
    const q = a / this.d + (2n * (a % this.d) >= this.d ? 1n : 0n);
    const valor = Number(this.n < 0n ? -q : q);
    if (!Number.isSafeInteger(valor)) throw new RangeError("Monto fuera de rango seguro");
    // Misma regla contable que @opai/domain; la decisión de la mitad se hace con enteros.
    return redondearCLP(valor);
  }
  exacto(): string { return `${this.n}/${this.d}`; }
}
export const N = (n: number, escala = 1): Numero => new Numero(n, escala);
export const CERO = N(0);
export const UNO = N(1);
export const sumar = (valores: readonly Numero[]): Numero => valores.reduce((a, b) => a.mas(b), CERO);
