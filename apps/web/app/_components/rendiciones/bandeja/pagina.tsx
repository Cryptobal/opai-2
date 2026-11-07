import { Cabecera, Estado, FilaSeleccionable, KpiTile, Segmentado, SplitScreen, Badge } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { identidadActual } from "@/lib/servidor";

import { pesos } from "../formato";
import { cargarBandeja, cargarDetalleBandeja } from "./datos";
import { DetalleRevision } from "./detalle";
import { FiltrosBandejaForm } from "./filtros";
import { FILTROS_ESTADO, filtrosDe, hrefBandeja, RUTA_BANDEJA } from "./tipos";

type Q = Record<string, string | string[] | undefined>;

/** Bandeja del aprobador: totales, filtros y lista a la izquierda; detalle a la derecha (en teléfono, una pantalla cada uno). */
export function PaginaBandeja({ searchParams, params }: { searchParams: Promise<Q>; params?: Promise<{ id: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Bandeja del aprobador"
      ruta={RUTA_BANDEJA}
      cargando="lista"
      {...(params ? { volver: { href: RUTA_BANDEJA, etiqueta: "Bandeja" } } : {})}
      cargar={async () => {
        const filtros = filtrosDe(await searchParams);
        const id = params ? (await params).id : null;
        const [bandeja, detalle, identidad] = await Promise.all([cargarBandeja(filtros), id ? cargarDetalleBandeja(id) : null, identidadActual()]);
        return { filtros, bandeja, detalle, id, yoId: identidad?.usuario.id ?? "" };
      }}
    >
      {({ filtros, bandeja, detalle, id, yoId }) => {
        const personas = [...new Map(bandeja.rendiciones.map((r) => [r.solicitanteId, r.solicitanteNombre ?? "Persona"])).entries()].map(([pid, nombre]) => ({ id: pid, nombre }));
        const lista = (
          <div className="flex flex-col p-4 md:p-0">
            <Estado
              state={bandeja.rendiciones.length === 0 ? "empty" : "ready"}
              variante="lista"
              textos={{ vacio: { titulo: filtros.estado === "enviada" ? "No tienes rendiciones por revisar" : "Sin rendiciones en este estado", descripcion: "Aquí aparecerán las rendiciones que te asignen." } }}
            >
              <ul>
                {bandeja.rendiciones.map((r) => (
                  <li key={r.id}>
                    <FilaSeleccionable
                      Link={LinkNext}
                      href={hrefBandeja(filtros, r.id)}
                      seleccionada={r.id === id}
                      titulo={r.codigoVisible}
                      secundario={`${r.solicitanteNombre ?? "Persona"} · ${r.descripcion}`}
                      terciario={pesos(r.montoTotal)}
                      fin={<Badge tono={r.estado === "enviada" ? "info" : r.estado === "aprobada" ? "success" : r.estado === "devuelta" ? "warning" : "danger"}>{r.estado === "enviada" ? "Por revisar" : r.estado}</Badge>}
                    />
                  </li>
                ))}
              </ul>
            </Estado>
          </div>
        );
        return (
          <>
            <Cabecera titulo="Bandeja del aprobador" subtitulo="Revisa y decide las rendiciones que te tocan." />
            <div className={`flex-col gap-3 px-4 pb-3 md:px-0 ${detalle ? "hidden md:flex" : "flex"}`}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <KpiTile etiqueta="Por revisar" valor={String(bandeja.porRevisar)} />
                <KpiTile etiqueta="Monto por revisar" valor={pesos(bandeja.montoPorRevisar)} />
                <KpiTile etiqueta="Aprobadas sin pagar" valor={String(bandeja.aprobadasSinPagar)} />
              </div>
              <Segmentado
                etiqueta="Estado"
                Link={LinkNext}
                activa={filtros.estado}
                opciones={FILTROS_ESTADO.map((f) => ({ id: f.id, etiqueta: f.etiqueta, href: hrefBandeja({ ...filtros, estado: f.id }) }))}
              />
              <FiltrosBandejaForm filtros={filtros} personas={personas} />
            </div>
            <SplitScreen
              contenido
              telefono={detalle ? "detalle" : "lista"}
              etiquetaLista="Rendiciones"
              etiquetaDetalle="Detalle de la rendición"
              vacio={{ texto: "Elige una rendición de la lista para revisarla." }}
              lista={lista}
              {...(detalle ? { detalle: <DetalleRevision d={detalle} yoId={yoId} /> } : {})}
            />
          </>
        );
      }}
    </PaginaPortal>
  );
}
