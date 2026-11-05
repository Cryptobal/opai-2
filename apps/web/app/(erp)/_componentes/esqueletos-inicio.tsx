import { Skeleton } from "@opai/ds";

/** Esqueleto con la forma de una tarjeta de Inicio: cabecera y filas (no se desplaza al llegar el dato). */
export function EsqueletoTarjeta({ filas = 3 }: { filas?: number }) {
  return (
    <div aria-hidden className="rounded-lg border border-border bg-surface">
      <div className="flex min-h-14 items-center border-b border-border px-4">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: filas }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Esqueleto de los cuatro indicadores. */
export function EsqueletoIndicadores() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[104px] rounded-lg" />
      ))}
    </div>
  );
}
