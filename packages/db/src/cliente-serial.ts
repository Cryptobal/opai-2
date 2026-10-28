import pg from "pg";

/**
 * Formas de `query` que no devuelven una promesa: callback final, un `Submittable` (cursor) o una
 * configuración con `callback`.
 */
function sinPromesa(args: readonly unknown[]): boolean {
  const primero = args[0];
  return (
    typeof args.at(-1) === "function" ||
    (typeof primero === "object" &&
      primero !== null &&
      ("submit" in primero || ("callback" in primero && typeof primero.callback === "function")))
  );
}

/**
 * Cliente `pg` que ejecuta sus consultas de a una. pg 8 encola las llamadas concurrentes a
 * `query()` sobre un mismo cliente, pero lo marca obsoleto (se elimina en pg 9) con una
 * DeprecationWarning. Dentro de una transacción interactiva Prisma puede pedir varias consultas a
 * la vez sobre la misma conexión (un `Promise.all` con `tx`, o lecturas anidadas); aquí cada una
 * espera a que la anterior termine, el mismo orden que ya aplicaba la cola interna de pg, sin el
 * aviso y sin depender de esa cola. Las formas con callback o cursor pasan directo (Prisma no las
 * usa). Una consulta fallida no bloquea las siguientes: la cola solo espera a que se resuelva.
 */
export class ClienteSerial extends pg.Client {
  #cola: Promise<unknown> = Promise.resolve();

  constructor(config?: string | pg.ClientConfig) {
    super(config);
    const original = this.query;
    this.query = ((...args: unknown[]) => {
      if (sinPromesa(args)) return Reflect.apply(original, this, args);
      const turno = this.#cola.then(() => Reflect.apply(original, this, args));
      this.#cola = turno.catch(() => undefined);
      return turno;
    }) as typeof original;
  }
}
