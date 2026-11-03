const PLAZO_MS = 10_000;

/** Rechaza si la acción no responde a tiempo: así la tarjeta muestra su error en vez de quedar cargando. */
export function conPlazo<T>(p: Promise<T>, ms = PLAZO_MS): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error("plazo")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolver(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        rechazar(e instanceof Error ? e : new Error("fallo"));
      },
    );
  });
}
