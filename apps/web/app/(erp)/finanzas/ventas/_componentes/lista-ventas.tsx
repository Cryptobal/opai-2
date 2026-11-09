import { FileText, Plus } from "lucide-react";

import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { pesos, rut } from "@/lib/fechas";

import { estadoCesionVenta, estadoCobroVenta, estadoDteVenta, tituloVenta } from "./etiquetas-venta";
import type { LibroVentas, Venta } from "./tipos";

function badgeEstado(v: Venta) {
  const e = estadoDteVenta(v.estadoDte);
  return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
}

/** Libro de ventas (DTE): facturas 33/34, notas de crédito 61. */
export function ListaVentas(p: {
  state: EstadoPantalla;
  libro: LibroVentas | null;
  gestiona: boolean;
  filtrado: boolean;
  periodos: { valor: string; etiqueta: string }[];
}) {
  const items = p.libro?.items ?? [];
  const r = p.libro?.resumen;
  return (
    <ListScreen<Venta>
      state={p.state}
      titulo="Ventas (DTE)"
      subtitulo={
        r
          ? `${r.documentos} documentos · Neto ${pesos(r.neto)} · Total ${pesos(r.total)}`
          : "Facturas 33 y 34, notas de crédito 61"
      }
      accionPrincipal={
        p.gestiona ? (
          <EnlaceBoton href="/finanzas/ventas/nuevo" icono={Plus}>
            Emitir
          </EnlaceBoton>
        ) : undefined
      }
      buscador={<Buscador placeholder="Buscar folio o cliente" />}
      filtros={
        <ChipsFiltro
          filtros={[
            { param: "periodo", etiqueta: "Período", opciones: p.periodos },
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
        />
      }
      items={items}
      clave={(v) => v.id}
      href={(v) => `/finanzas/ventas/${v.id}`}
      Link={LinkNext}
      textos={{
        vacio: p.filtrado
          ? { titulo: "Sin resultados", descripcion: "Prueba otro período o término de búsqueda." }
          : {
              titulo: "Aún no hay documentos",
              descripcion: "Los borradores y las facturas emitidas aparecen aquí.",
            },
      }}
      tarjeta={(v) => (
        <>
          <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
            <FileText className="size-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-medium">{v.cuentaNombre}</span>
            <span className="text-sm text-fg-muted">
              {v.folio ? `Folio ${v.folio}` : "Borrador"} · {v.tipoDteNombre}
            </span>
          </span>
          <span className="flex flex-none flex-col items-end gap-1">
            <span className="t-numeric font-medium">{pesos(v.montoTotal)}</span>
            {badgeEstado(v)}
          </span>
        </>
      )}
      columnas={[
        {
          id: "doc",
          etiqueta: "Documento",
          render: (v) => tituloVenta(v),
        },
        {
          id: "cliente",
          etiqueta: "Cliente",
          render: (v) => (
            <span className="flex flex-col">
              <span>{v.cuentaNombre}</span>
              <span className="t-mono text-xs text-fg-muted">{v.cuentaRut ? rut(v.cuentaRut) : "—"}</span>
            </span>
          ),
        },
        { id: "fecha", etiqueta: "Emisión", render: (v) => v.fechaEmision ?? "—" },
        {
          id: "total",
          etiqueta: "Total",
          className: "text-right t-numeric",
          render: (v) => pesos(v.tipoDte === 61 ? -v.montoTotal : v.montoTotal),
        },
        { id: "estado", etiqueta: "Estado SII", render: (v) => badgeEstado(v) },
        {
          id: "cobro",
          etiqueta: "Cobro",
          render: (v) => {
            const e = estadoCobroVenta(v.estadoCobro);
            return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
          },
        },
        {
          id: "cesion",
          etiqueta: "Cesión",
          render: (v) =>
            v.cesionEstado ? (
              <Badge tono={estadoCesionVenta(v.cesionEstado).tono}>
                {estadoCesionVenta(v.cesionEstado).etiqueta}
              </Badge>
            ) : (
              "—"
            ),
        },
      ]}
    />
  );
}
