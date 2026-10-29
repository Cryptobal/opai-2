import pg from "pg";

type Paso = { ms: number; err?: Error };

/** Cliente sin red: cada `connect` consume un paso (tarda `ms` de temporizador y falla o conecta). */
export function clientePlan(pasos: Paso[], contador: { n: number }) {
  return class extends pg.Client {
    override connect(): Promise<pg.Client>;
    override connect(cb: (err: Error | null, c?: pg.Client) => void): void;
    override connect(cb?: (err: Error | null, c?: pg.Client) => void): Promise<pg.Client> | void {
      contador.n++;
      const paso = pasos.shift() ?? { ms: 1 };
      const listo = new Promise<pg.Client>((ok, mal) =>
        setTimeout(() => (paso.err ? mal(paso.err) : ok(this)), paso.ms),
      );
      if (!cb) return listo;
      listo.then(
        (c) => cb(null, c),
        (e: Error) => cb(e),
      );
    }
    override end(): Promise<void> {
      return Promise.resolve();
    }
  };
}
