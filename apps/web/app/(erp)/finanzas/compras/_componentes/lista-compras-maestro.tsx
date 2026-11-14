import { Plus } from "lucide-react";

import { Alerta, Badge } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { pesos } from "@/lib/fechas";
import type { Parametros } from "@/lib/parametros";

import { PestanasCompras } from "../../_componentes/pestanas-compras";
import { type Compra, diaCL, NOMBRE_DTE } from "../../_componentes/tipos";
import { type cargarLibro, periodosRecientes } from "./datos";
import { conFiltrosCompras } from "./filtros-url";

/** Total con signo: una nota de crédito resta del libro. */
export const montoCompra = (c: Compra) => pesos(c.tipoDte === 61 ? -c.montoTotal : c.montoTotal);

type Datos = Awaited<ReturnType<typeof cargarLibro>>;

/** Columna izquierda del libro de compras (CAR-256): pestañas, aviso de centros, búsqueda, filtros y filas. */
export function ListaComprasMaestro({ datos: d, seleccionada, params }: { datos: Datos; seleccionada?: string; params: Parametros }) {
  const items = d.libro?.items ?? [];
  const r = d.libro?.resumen;
  const acciones = d.gestiona ? (
    // Tres acciones: en una columna angosta pasan a otra línea en vez de salirse.
    <div className="flex max-w-full flex-wrap justify-end gap-2">
      <EnlaceBotonHoja href="?sii=1" variante="secondary">Sincronizar con el SII</EnlaceBotonHoja>
      <EnlaceBotonHoja href="?rcv=1" variante="secondary">Importar RCV</EnlaceBotonHoja>
      <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>Registrar documento</EnlaceBotonHoja>
    </div>
  ) : undefined;
  const aviso =
    r && r.sinCentroCosto > 0 ? (
      <Alerta
        tono="warning"
        titulo={`${r.sinCentroCosto} ${r.sinCentroCosto === 1 ? "documento sin centro de costo" : "documentos sin centro de costo"}`}
        {...(d.gestiona ? { accion: <EnlaceBotonHoja href="?lote=1" variante="secondary">Asignar en lote</EnlaceBotonHoja> } : {})}
      >
        Asígnalos para que el gasto llegue a la instalación correcta.
      </Alerta>
    ) : undefined;
  return (
    <>
      <div className="md:px-4 md:pt-3">
        <PestanasCompras activa="libro" />
      </div>
      <ListaMaestro
        state={d.state}
        titulo="Libro de compras"
        accion={acciones}
        vista={aviso}
        buscar="Buscar folio o proveedor"
        filtros={[
          { param: "periodo", etiqueta: "Período", opciones: periodosRecientes() },
          { param: "sin_centro", etiqueta: "Centro", opciones: [{ valor: "1", etiqueta: "Sin centro de costo" }] },
        ]}
        meta={{ izquierda: r ? `${r.documentos} documentos · Total ${pesos(r.total)}` : `${items.length} documentos` }}
        seleccionada={seleccionada}
        vacio={
          d.filtrado
            ? { titulo: "Ningún documento coincide", descripcion: "Quita un filtro para ver más." }
            : {
                titulo: "El libro de compras está vacío",
                descripcion: "Sincroniza con el SII, importa el archivo del RCV o registra un documento recibido.",
                // Las tres acciones ya están arriba; el vacío ofrece solo la más común, como antes del maestro-detalle.
                ...(d.gestiona
                  ? { accion: <EnlaceBotonHoja href="?sii=1" variante="secondary">Sincronizar con el SII</EnlaceBotonHoja> }
                  : {}),
              }
        }
        filas={items.map((c) => ({
          id: c.id,
          href: conFiltrosCompras(`/finanzas/compras/${c.id}`, params),
          titulo: c.proveedorNombre,
          secundario: `${NOMBRE_DTE[c.tipoDte] ?? c.tipoDte} ${c.folio} · ${diaCL(c.fechaRecepcion)}`,
          terciario: c.centroCostoNombre ?? "Sin centro de costo",
          fin: (
            <>
              <span className="t-numeric font-medium">{montoCompra(c)}</span>
              <Badge>Sin conciliar</Badge>
            </>
          ),
        }))}
        {...(d.libro?.siguiente ? { pie: <p className="px-4 py-3 text-sm text-fg-muted">Se muestran los primeros 100 documentos: acota el período para ver el resto.</p> } : {})}
      />
    </>
  );
}
