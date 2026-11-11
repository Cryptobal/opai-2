import { Plus } from "lucide-react";

import { Badge, type EstadoPantalla } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { fecha, pesos } from "@/lib/fechas";
import type { Parametros } from "@/lib/parametros";

import { PestanasVentas } from "../../_componentes/pestanas-ventas";
import { estadoDteVenta } from "./etiquetas-venta";
import { conFiltros } from "./filtros-url";
import type { LibroVentas, Venta } from "./tipos";

export type DatosLibro = {
  state: EstadoPantalla;
  libro: LibroVentas | null;
  gestiona: boolean;
  filtrado: boolean;
  periodos: { valor: string; etiqueta: string }[];
};

/** Columna izquierda del Libro de ventas (CAR-255): pestañas, búsqueda, filtros y filas seleccionables. */
export function ListaVentasMaestro({ datos: d, seleccionada, params }: { datos: DatosLibro; seleccionada?: string; params: Parametros }) {
  const items = d.libro?.items ?? [];
  const r = d.libro?.resumen;
  const emitir = d.gestiona ? (
    <EnlaceBoton href="/finanzas/ventas/nuevo" icono={Plus}>
      Emitir
    </EnlaceBoton>
  ) : undefined;
  return (
    <>
      <div className="md:px-4 md:pt-3">
        <PestanasVentas activa="libro" />
      </div>
      <ListaMaestro
        state={d.state}
        titulo="Ventas (DTE)"
        accion={emitir}
        buscar="Buscar folio o cliente"
        filtros={[
          { param: "periodo", etiqueta: "Período", opciones: d.periodos },
          {
            param: "estado",
            etiqueta: "Estado",
            opciones: [
              { valor: "borrador", etiqueta: "Borradores" },
              { valor: "aceptado", etiqueta: "Aceptadas" },
              { valor: "enviado", etiqueta: "Enviadas" },
            ],
          },
        ]}
        meta={{
          izquierda: `${r?.documentos ?? items.length} documentos`,
          ...(r && r.total > 0 ? { derecha: `Total ${pesos(r.total)}` } : {}),
        }}
        seleccionada={seleccionada}
        vacio={
          d.filtrado
            ? { titulo: "Sin resultados", descripcion: "Prueba otro período o término de búsqueda." }
            : { titulo: "Aún no hay documentos", descripcion: "Los borradores y las facturas emitidas aparecen aquí.", accion: emitir }
        }
        filas={items.map((v) => ({
          id: v.id,
          href: conFiltros(`/finanzas/ventas/${v.id}`, params),
          titulo: v.cuentaNombre,
          secundario: `${v.folio ? `Folio ${v.folio}` : "Borrador"} · ${v.tipoDteNombre}`,
          terciario: v.fechaEmision ? fecha(v.fechaEmision) : "Sin fecha de emisión",
          fin: <FinFila venta={v} />,
        }))}
      />
    </>
  );
}

function FinFila({ venta: v }: { venta: Venta }) {
  const e = estadoDteVenta(v.estadoDte);
  return (
    <>
      <span className="t-numeric font-medium">{pesos(v.tipoDte === 61 ? -v.montoTotal : v.montoTotal)}</span>
      <Badge tono={e.tono}>{e.etiqueta}</Badge>
    </>
  );
}
