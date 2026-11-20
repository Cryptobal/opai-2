import { Estado } from "@opai/ds";

import { FilaBandejaRendicion } from "./fila-bandeja";
import type { Bandeja, FiltrosBandeja } from "./tipos";

export function ListaBandejaRendiciones({
  filtros,
  bandeja,
  id,
}: {
  filtros: FiltrosBandeja;
  bandeja: Bandeja;
  id: string | null;
}) {
  return (
    <div className="flex flex-col p-4 md:p-0">
      <Estado
        state={bandeja.items.length === 0 ? "empty" : "ready"}
        variante="lista"
        textos={{
          vacio: {
            titulo: filtros.estado === "enviada" ? "No tienes rendiciones por revisar" : "Sin rendiciones en este estado",
            descripcion: "Aquí aparecerán las rendiciones que te asignen.",
          },
        }}
      >
        <ul>
          {bandeja.items.map((r) => (
            <li key={r.id}>
              <FilaBandejaRendicion r={r} filtros={filtros} idActiva={id} />
            </li>
          ))}
        </ul>
      </Estado>
    </div>
  );
}