import { Package, Plus } from "lucide-react";

import { Badge, type EstadoPantalla } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { conBusqueda } from "@/lib/parametros";
import { conteo } from "@/lib/plural";

import { PestanasInventario } from "./pestanas";
import { type Activo, ESTADOS_ACTIVO, estadoActivo, type TipoInventario } from "./tipos";

/** Columna de activos (CAR-236): búsqueda por código o serie, filtros por tipo y estado. */
export function ListaActivos({
  state,
  items,
  tipos,
  seleccionada,
  q,
  puedeGestionar,
}: {
  state: EstadoPantalla;
  items: Activo[];
  tipos: TipoInventario[];
  seleccionada?: string;
  q?: string;
  puedeGestionar: boolean;
}) {
  const nuevo =
    puedeGestionar && tipos.length > 0 ? (
      <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
        Nuevo
      </EnlaceBotonHoja>
    ) : undefined;
  return (
    <ListaMaestro
      state={state}
      titulo="Inventario"
      vista={<PestanasInventario activa="activos" />}
      accion={nuevo}
      accionFlotante={Boolean(nuevo)}
      buscar="Buscar por código o serie"
      filtros={[
        { param: "tipo", etiqueta: "Tipo", opciones: tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre })) },
        { param: "estado", etiqueta: "Estado", opciones: ESTADOS_ACTIVO.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta })) },
      ]}
      meta={{ izquierda: conteo(items.length, "activo"), derecha: "Código A–Z" }}
      seleccionada={seleccionada}
      vacio={
        tipos.length === 0
          ? { titulo: "Primero crea los tipos", descripcion: "Define en la pestaña Tipos qué activos controla tu empresa." }
          : {
              titulo: "Sin activos",
              descripcion: puedeGestionar ? "Registra el primero o ajusta los filtros." : "Ajusta la búsqueda o los filtros.",
              ...(nuevo ? { accion: nuevo } : {}),
            }
      }
      filas={items.map((a) => {
        const estado = estadoActivo(a.estado);
        return {
          id: a.id,
          href: conBusqueda(`/inventario/activos/${a.id}`, q),
          inicio: (
            <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
              <Package className="size-4" aria-hidden />
            </span>
          ),
          titulo: <span className="font-medium">{a.codigo}</span>,
          secundario: (
            <>
              {a.tipo}
              {a.numeroSerie ? ` · ${a.numeroSerie}` : ""}
              <span className="md:hidden"> · {estado.etiqueta}</span>
            </>
          ),
          fin: (
            <Badge tono={estado.tono} className="hidden md:inline-flex">
              {estado.etiqueta}
            </Badge>
          ),
        };
      })}
    />
  );
}
