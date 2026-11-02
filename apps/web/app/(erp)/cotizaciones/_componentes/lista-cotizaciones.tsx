import { Badge, ListScreen } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { pesos } from "@/lib/fechas";

import type { CotizacionFila, DatosCotizaciones } from "./datos";

const ESTADOS: Record<string, string> = {
  borrador: "Borrador",
  en_aprobacion: "En aprobación",
  lista: "Lista",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
  reemplazada: "Reemplazada",
  archivada: "Archivada",
};
const estado = (c: CotizacionFila) => (
  <Badge tono={c.version?.estado === "aceptada" ? "success" : "neutro"}>
    {ESTADOS[c.version?.estado ?? ""] ?? "Sin versión"}
  </Badge>
);
const vigencia = (c: CotizacionFila) => (c.vigente ? "Vigente" : "Alternativa");
const fecha = (c: CotizacionFila) =>
  c.version?.validaHasta?.split("-").reverse().join("-") ?? "Sin fecha";
const venta = (c: CotizacionFila) =>
  c.version?.ventaMensualClp == null ? "Sin calcular" : pesos(c.version.ventaMensualClp);

/** Lista móvil y tabla desde md; el código abre las cotizaciones de su negocio. */
export function ListaCotizaciones({
  datos: d,
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
    d.crear && abierto ? (
      <EnlaceBoton href={`/cotizaciones/nueva${negocioId ? `?negocio=${negocioId}` : ""}`}>
        Nueva cotización
      </EnlaceBoton>
    ) : undefined;
  return (
    <ListScreen
      state={d.state}
      titulo="Cotizaciones"
      items={d.items}
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
          <p className="t-body-sm break-words">{c.negocioTitulo ?? "Negocio"}</p>
          <div className="flex flex-wrap items-center gap-2">
            {estado(c)}
            <Badge punto={false}>{vigencia(c)}</Badge>
          </div>
          <p className="t-caption">
            Versión {c.version?.numero ?? "—"} · Válida hasta {fecha(c)}
          </p>
          <p className="t-body-sm text-fg-muted">{venta(c)}</p>
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
        { id: "negocio", etiqueta: "Negocio", render: (c) => c.negocioTitulo ?? "Negocio" },
        { id: "estado", etiqueta: "Estado", render: estado },
        { id: "version", etiqueta: "Versión", render: (c) => c.version?.numero ?? "—" },
        { id: "validez", etiqueta: "Válida hasta", render: fecha },
        { id: "vigente", etiqueta: "Vigencia", render: vigencia },
        { id: "venta", etiqueta: "Venta mensual", render: venta },
      ]}
      paginacion={
        d.siguiente ? (
          <EnlaceBoton href={`${base}?cursor=${d.siguiente}`} variante="secondary">
            Siguiente
          </EnlaceBoton>
        ) : null
      }
    />
  );
}
