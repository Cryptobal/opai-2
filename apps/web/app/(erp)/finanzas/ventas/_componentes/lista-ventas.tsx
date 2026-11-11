import { FileText, Plus } from "lucide-react";

import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { fecha, pesos, rut } from "@/lib/fechas";

import { AccionesFilaBorrador } from "./acciones-fila-borrador";
import { estadoCesionVenta, estadoCobroVenta, estadoDteVenta, seCobra, tituloCorto } from "./etiquetas-venta";
import { FiltrosVentas } from "./filtros-ventas";
import type { LibroVentas, Venta } from "./tipos";

/** La nota de crédito resta: se muestra con signo negativo en la tabla y en la tarjeta. */
const montoConSigno = (v: Venta) => pesos(v.tipoDte === 61 ? -v.montoTotal : v.montoTotal);

function badgeEstado(v: Venta) {
  const e = estadoDteVenta(v.estadoDte, v.trackIdSii);
  return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
}

/** Libro de ventas (DTE): facturas 33/34, notas de crédito 61 y de débito 56. */
export function ListaVentas(p: {
  state: EstadoPantalla;
  libro: Pick<LibroVentas, "items" | "siguiente"> | null;
  subtitulo: string | null;
  gestiona: boolean;
  filtrado: boolean;
  periodos: { valor: string; etiqueta: string }[];
}) {
  const items = p.libro?.items ?? [];
  return (
    <ListScreen<Venta>
      state={p.state}
      titulo="Ventas (DTE)"
      subtitulo={p.subtitulo ?? "Facturas, notas de crédito y notas de débito"}
      accionPrincipal={
        p.gestiona ? (
          <EnlaceBoton href="/finanzas/ventas/nuevo" icono={Plus}>
            Emitir
          </EnlaceBoton>
        ) : undefined
      }
      buscador={<Buscador placeholder="Buscar folio o cliente" />}
      filtros={<FiltrosVentas periodos={p.periodos} />}
      items={items}
      clave={(v) => v.id}
      {...(p.gestiona ? { acciones: (v: Venta) => (v.estadoDte === "borrador" ? <AccionesFilaBorrador venta={v} /> : null) } : {})}
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
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate font-medium">{tituloCorto(v)}</span>
              <span className="t-numeric flex-none font-medium">{montoConSigno(v)}</span>
            </span>
            <span className="truncate text-sm text-fg-muted">{v.cuentaNombre}</span>
            <span className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              <span className="t-numeric">{fecha(v.fechaEmision)}</span>
              {badgeEstado(v)}
            </span>
          </span>
        </>
      )}
      columnas={[
        {
          id: "doc",
          etiqueta: "Documento",
          render: (v) => tituloCorto(v),
        },
        {
          id: "cliente",
          etiqueta: "Cliente",
          render: (v) => (
            <span className="flex max-w-[16rem] flex-col lg:max-w-[22rem]">
              <span className="truncate" title={v.cuentaNombre}>{v.cuentaNombre}</span>
              <span className="t-mono text-xs text-fg-muted">{v.cuentaRut ? rut(v.cuentaRut) : "—"}</span>
            </span>
          ),
        },
        { id: "fecha", etiqueta: "Emisión", render: (v) => fecha(v.fechaEmision) },
        {
          id: "total",
          etiqueta: "Total",
          className: "text-right t-numeric",
          render: (v) => montoConSigno(v),
        },
        { id: "estado", etiqueta: "Estado SII", render: (v) => badgeEstado(v) },
        {
          id: "cobro",
          etiqueta: "Cobro",
          render: (v) => {
            if (!seCobra(v)) return "—";
            const e = estadoCobroVenta(v.estadoCobro);
            return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
          },
        },
        {
          id: "cesion",
          etiqueta: "Cesión",
          render: (v) =>
            v.cesionEstado && seCobra(v) ? (
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
