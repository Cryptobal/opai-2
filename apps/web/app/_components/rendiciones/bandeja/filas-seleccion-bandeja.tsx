import { Checkbox } from "@opai/ds";

import { FilaBandejaRendicion } from "./fila-bandeja";
import type { Bandeja, FiltrosBandeja } from "./tipos";

type Fila = Bandeja["items"][number];

export function FilasSeleccionBandeja({
  rendiciones,
  filtros,
  idActiva,
  sel,
  alternar,
}: {
  rendiciones: readonly Fila[];
  filtros: FiltrosBandeja;
  idActiva: string | null;
  sel: ReadonlySet<string>;
  alternar: (id: string, v: boolean) => void;
}) {
  return (
    <ul>
      {rendiciones.map((r) => (
        <li key={r.id} className="flex items-stretch gap-1">
          {r.estado === "enviada" ? (
            <div className="flex items-center pl-2 md:pl-0">
              <Checkbox
                soloControl
                marcado={sel.has(r.id)}
                onCambiar={(v) => alternar(r.id, v)}
                etiqueta={`Seleccionar ${r.codigoVisible}`}
              />
            </div>
          ) : (
            <span className="w-10 shrink-0" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <FilaBandejaRendicion r={r} filtros={filtros} idActiva={idActiva} />
          </div>
        </li>
      ))}
    </ul>
  );
}