import { Package, Plus, Shirt } from "lucide-react";

import { Badge, type EstadoPantalla } from "@opai/ds";
import { formatearFecha } from "@opai/domain";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { conteo } from "@/lib/plural";

import { PestanasInventario } from "./pestanas";
import type { Entrega } from "./tipos";


function filaEntrega(x: Entrega, puedeGestionar: boolean) {
  const Icono = x.clase === "ropa" ? Shirt : Package;
  const abierta = x.devueltaEn === null;
  return {
    id: x.id,
    href: abierta && puedeGestionar ? `?devolver=${x.id}` : x.activoId ? `/inventario/activos/${x.activoId}` : "/inventario/entregas",
    inicio: (
      <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
        <Icono className="size-4" aria-hidden />
      </span>
    ),
    titulo: <span className="font-medium">{x.cantidad ? `${x.cantidad} × ${x.item}` : x.item}</span>,
    secundario: `${x.destino} · ${formatearFecha(x.entregadaEn)}`,
    fin: <Badge tono={abierta ? "info" : "neutro"}>{abierta ? "Entregado" : `Devuelto ${formatearFecha(x.devueltaEn ?? x.entregadaEn)}`}</Badge>,
  };
}

/** Columna de entregas (CAR-238): lo que tiene cada persona o instalación y lo ya devuelto. */
export function ListaEntregas({
  state,
  items,
  puedeGestionar,
}: {
  state: EstadoPantalla;
  items: Entrega[];
  puedeGestionar: boolean;
}) {
  const nueva = puedeGestionar ? (
    <EnlaceBotonHoja href="?nueva=1" icono={Plus}>
      Nueva entrega
    </EnlaceBotonHoja>
  ) : undefined;
  return (
    <ListaMaestro
      state={state}
      titulo="Inventario"
      vista={<PestanasInventario activa="entregas" />}
      accion={nueva}
      accionFlotante={Boolean(nueva)}
      buscar="Buscar por prenda, activo o persona"
      filtros={[
        {
          param: "estado",
          etiqueta: "Estado",
          opciones: [
            { valor: "abiertas", etiqueta: "Entregadas" },
            { valor: "devueltas", etiqueta: "Devueltas" },
            { valor: "todas", etiqueta: "Todas" },
          ],
        },
      ]}
      meta={{ izquierda: conteo(items.length, "entrega"), derecha: "Más recientes" }}
      vacio={{ titulo: "Sin entregas", descripcion: "Registra la primera con «Nueva entrega».", ...(nueva ? { accion: nueva } : {}) }}
      filas={items.map((x) => filaEntrega(x, puedeGestionar))}
    />
  );
}
