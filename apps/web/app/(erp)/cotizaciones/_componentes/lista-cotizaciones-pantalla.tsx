import { Badge, ListScreen } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { estadoCpqBadge } from "@/lib/cpq-presentacion";

import type { CotizacionFila, DatosCotizaciones } from "./datos";
import { margenLista, ventaLista } from "./lista-cotizaciones-helpers";

/** Vista tabla completa cuando no hay ficha seleccionada (ruta /cotizaciones sola en móvil). */
export function ListaCotizacionesPantalla({
  datos,
  negocioId,
  abierto = true,
  base = "/cotizaciones",
}: {
  datos: DatosCotizaciones;
  negocioId?: string;
  abierto?: boolean;
  base?: string;
}) {
  const nueva =
    datos.crear && abierto ? (
      <EnlaceBoton href={`/cotizaciones/nueva${negocioId ? `?negocio=${negocioId}` : ""}`}>
        Nueva cotización
      </EnlaceBoton>
    ) : undefined;
  const estado = (c: CotizacionFila) => {
    const e = estadoCpqBadge(c.version?.estado ?? "borrador");
    return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
  };
  return (
    <ListScreen
      state={datos.state}
      titulo="Cotizaciones"
      items={datos.items}
      clave={(c) => c.id}
      accionPrincipal={nueva}
      Link={LinkNext}
      href={(c) => `/cotizaciones/${c.id}`}
      textos={{
        vacio: {
          titulo: "Aún no hay cotizaciones",
          descripcion: "Crea una cotización ligada a un negocio abierto.",
          accion: nueva,
        },
        error: { accion: <BotonReintentar /> },
      }}
      tarjeta={(c) => (
        <div className="min-w-0 flex-1 space-y-2">
          <p className="t-label">
            {c.codigo} · {c.titulo}
          </p>
          <p className="t-body-sm break-words">{c.cuentaTitulo ?? c.negocioTitulo ?? "Negocio"}</p>
          <div className="flex flex-wrap items-center gap-2">{estado(c)}</div>
          <p className="t-caption">
            Versión {c.version?.numero ?? "—"} · {ventaLista(c)}
          </p>
        </div>
      )}
      columnas={[
        {
          id: "codigo",
          etiqueta: "Cotización",
          render: (c) => (
            <>
              <p className="t-label">{c.codigo}</p>
              <p>{c.titulo}</p>
            </>
          ),
        },
        {
          id: "cuenta",
          etiqueta: "Cuenta",
          render: (c) => c.cuentaTitulo ?? c.negocioTitulo ?? "—",
        },
        { id: "estado", etiqueta: "Estado", render: estado },
        { id: "version", etiqueta: "Versión", render: (c) => c.version?.numero ?? "—" },
        { id: "venta", etiqueta: "Venta mensual", render: ventaLista },
        ...(datos.costos
          ? [
              {
                id: "margen",
                etiqueta: "Margen",
                render: (c: CotizacionFila) => margenLista(c, true) ?? "—",
              },
            ]
          : []),
      ]}
      paginacion={
        datos.siguiente ? (
          <EnlaceBoton href={`${base}?cursor=${datos.siguiente}`} variante="secondary">
            Siguiente
          </EnlaceBoton>
        ) : null
      }
    />
  );
}
