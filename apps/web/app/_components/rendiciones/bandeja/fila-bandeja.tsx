import { Badge, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { pesos } from "../formato";
import { hrefBandeja, type Bandeja, type FiltrosBandeja } from "./tipos";

type Fila = Bandeja["items"][number];

function badgeEstado(estado: Fila["estado"]) {
  const tono =
    estado === "enviada" ? "info" : estado === "aprobada" ? "success" : estado === "devuelta" ? "warning" : "danger";
  return <Badge tono={tono}>{estado === "enviada" ? "Por revisar" : estado}</Badge>;
}

export function FilaBandejaRendicion({
  r,
  filtros,
  idActiva,
}: {
  r: Fila;
  filtros: FiltrosBandeja;
  idActiva: string | null;
}) {
  return (
    <FilaSeleccionable
      Link={LinkNext}
      href={hrefBandeja(filtros, r.id)}
      seleccionada={r.id === idActiva}
      titulo={r.codigoVisible}
      secundario={`${r.solicitanteNombre ?? "Persona"} · ${r.descripcion}`}
      terciario={pesos(r.montoTotal)}
      fin={badgeEstado(r.estado)}
    />
  );
}