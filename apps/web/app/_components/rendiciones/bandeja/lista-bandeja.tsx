import { Badge, Estado, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { pesos } from "../formato";
import type { Bandeja, FiltrosBandeja } from "./tipos";
import { hrefBandeja } from "./tipos";

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
              <FilaSeleccionable
                Link={LinkNext}
                href={hrefBandeja(filtros, r.id)}
                seleccionada={r.id === id}
                titulo={r.codigoVisible}
                secundario={`${r.solicitanteNombre ?? "Persona"} · ${r.descripcion}`}
                terciario={pesos(r.montoTotal)}
                fin={
                  <Badge
                    tono={r.estado === "enviada" ? "info" : r.estado === "aprobada" ? "success" : r.estado === "devuelta" ? "warning" : "danger"}
                  >
                    {r.estado === "enviada" ? "Por revisar" : r.estado}
                  </Badge>
                }
              />
            </li>
          ))}
        </ul>
      </Estado>
    </div>
  );
}