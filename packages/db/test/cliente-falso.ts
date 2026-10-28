import pg from "pg";

type AlConectar = ((err: Error) => void) | ((err: null, c: pg.Client) => void);

/** Cliente sin red para pg-pool: cada `connect` consume el siguiente fallo de `fallos`, si hay. */
export function clienteFalso(fallos: Error[]) {
  return class extends pg.Client {
    override connect(): Promise<pg.Client>;
    override connect(cb: AlConectar): void;
    override connect(cb?: AlConectar): Promise<pg.Client> | void {
      const err = fallos.shift();
      const listo = new Promise<pg.Client>((ok, mal) =>
        setTimeout(() => (err ? mal(err) : ok(this)), 1),
      );
      if (!cb) return listo;
      listo.then(
        (c) => (cb as (err: null, c: pg.Client) => void)(null, c),
        (e: Error) => (cb as (err: Error) => void)(e),
      );
    }
    override end(): Promise<void> {
      return Promise.resolve();
    }
  };
}
