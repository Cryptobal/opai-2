import { Package, Plus, Shirt } from "lucide-react";

import { Badge, type EstadoPantalla } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { conBusqueda } from "@/lib/parametros";
import { conteo } from "@/lib/plural";

import { CATEGORIAS, etiquetaCategoria, type TipoInventario } from "./datos";
import { CargarSugeridos } from "./diferidas";
import { PestanasInventario } from "./pestanas";

const detalle = (t: TipoInventario) =>
  t.categoria === "ropa" ? conteo(t.tallas.length, "talla") : conteo(t.campos.length, "campo propio", "campos propios");

/** Columna de tipos de inventario: catálogo con búsqueda, categoría y estado (CAR-235). */
export function ListaTipos({
  state,
  items,
  total,
  seleccionada,
  q,
  puedeGestionar,
}: {
  state: EstadoPantalla;
  items: TipoInventario[];
  total: number;
  seleccionada?: string;
  q?: string;
  puedeGestionar: boolean;
}) {
  const activos = items.filter((t) => t.activo).length;
  const nuevo = puedeGestionar ? (
    <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
      Nuevo
    </EnlaceBotonHoja>
  ) : undefined;
  return (
    <ListaMaestro
      state={state}
      titulo="Inventario"
      vista={<PestanasInventario activa="tipos" />}
      accion={nuevo}
      accionFlotante={Boolean(nuevo)}
      buscar="Buscar tipo"
      filtros={[
        { param: "categoria", etiqueta: "Categoría", opciones: CATEGORIAS },
        {
          param: "estado",
          etiqueta: "Estado",
          opciones: [
            { valor: "activo", etiqueta: "Activo" },
            { valor: "inactivo", etiqueta: "Inactivo" },
          ],
        },
      ]}
      meta={{
        izquierda: `${conteo(items.length, "tipo")} · ${activos} ${activos === 1 ? "activo" : "activos"}`,
        derecha: "Nombre A–Z",
      }}
      seleccionada={seleccionada}
      vacio={
        total === 0
          ? {
              titulo: "Aún no hay tipos",
              descripcion: puedeGestionar
                ? "Carga los típicos de tu rubro o crea el primero."
                : "Quien administra Inventario todavía no crea tipos.",
              ...(puedeGestionar ? { accion: <CargarSugeridos /> } : {}),
            }
          : { titulo: "Sin resultados", descripcion: "Ajusta la búsqueda o los filtros." }
      }
      filas={items.map((t) => {
        const Icono = t.categoria === "ropa" ? Shirt : Package;
        return {
          id: t.id,
          href: conBusqueda(`/inventario/tipos/${t.id}`, q),
          inicio: (
            <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
              <Icono className="size-4" aria-hidden />
            </span>
          ),
          titulo: <span className="font-medium">{t.nombre}</span>,
          secundario: (
            <>
              {etiquetaCategoria(t.categoria)} · {detalle(t)}
              <span className="md:hidden"> · {t.activo ? "Activo" : "Inactivo"}</span>
            </>
          ),
          fin: (
            <Badge tono={t.activo ? "success" : "neutro"} className="hidden md:inline-flex">
              {t.activo ? "Activo" : "Inactivo"}
            </Badge>
          ),
        };
      })}
    />
  );
}
