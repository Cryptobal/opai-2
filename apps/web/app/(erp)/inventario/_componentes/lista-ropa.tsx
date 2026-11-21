import { Shirt } from "lucide-react";

import { type EstadoPantalla } from "@opai/ds";

import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { conBusqueda } from "@/lib/parametros";
import { conteo } from "@/lib/plural";

import { PestanasInventario } from "./pestanas";
import type { Prenda } from "./tipos";

function filaPrenda(x: Prenda, q?: string) {
  const conStock = x.existencias.filter((e) => e.cantidad > 0).map((e) => `${e.talla} ${e.cantidad}`);
  return {
    id: x.tipoId,
    href: conBusqueda(`/inventario/ropa/${x.tipoId}`, q),
    inicio: (
      <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
        <Shirt className="size-4" aria-hidden />
      </span>
    ),
    titulo: <span className="font-medium">{x.nombre}</span>,
    secundario: conStock.length ? conStock.join(" · ") : "Sin existencias",
    fin: <span className="t-label tabular-nums">{conteo(x.total, "unidad", "unidades")}</span>,
  };
}

/** Columna de ropa (CAR-237): cada tipo de ropa con sus existencias por talla. */
export function ListaRopa({
  state,
  items,
  seleccionada,
  q,
}: {
  state: EstadoPantalla;
  items: Prenda[];
  seleccionada?: string;
  q?: string;
}) {
  return (
    <ListaMaestro
      state={state}
      titulo="Inventario"
      vista={<PestanasInventario activa="ropa" />}
      buscar="Buscar prenda"
      meta={{ izquierda: conteo(items.length, "prenda"), derecha: "Nombre A–Z" }}
      seleccionada={seleccionada}
      vacio={{ titulo: "Sin ropa", descripcion: "Crea tipos de ropa con sus tallas en la pestaña Tipos." }}
      filas={items.map((x) => filaPrenda(x, q))}
    />
  );
}
