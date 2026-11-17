import { Badge, Cabecera, Estado, FilaSeleccionable, KpiTile, Segmentado, SplitScreen } from "@opai/ds";
import { formatearClp } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros } from "@/lib/parametros";
import { AccionesTurno } from "./acciones-turno";
import { cargarTurnosExtra } from "./datos";
import { ESTADOS, hrefTurnosExtra, RUTA_TURNOS_EXTRA, type TurnoExtra } from "./tipos";

type Q = Record<string, string | string[] | undefined>;

export function PaginaTurnosExtra({ searchParams }: { searchParams: Promise<Q> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Turnos extra"
      ruta={RUTA_TURNOS_EXTRA}
      cargando="lista"
      cargar={async () => cargarTurnosExtra(await leerParametros(searchParams))}
    >
      {(d) => {
        const filtros = { estado: d.estado, inst: d.instalacionId ?? undefined };
        const lista = (
          <div className="flex flex-col p-4 md:p-0">
            <Estado
              state={d.items.length ? "ready" : "empty"}
              variante="lista"
              textos={{ vacio: { titulo: "No hay turnos en este estado", descripcion: "Los reemplazos y refuerzos de la pauta aparecen aquí." } }}
            >
              <ul>
                {d.items.map((t) => (
                  <li key={t.id}>
                    <FilaSeleccionable
                      Link={LinkNext}
                      href={hrefTurnosExtra({ ...filtros, ver: t.id })}
                      seleccionada={t.id === d.ver}
                      titulo={`${t.fecha} · ${t.instalacionNombre}`}
                      secundario={`${t.puestoNombre} · ${t.personaNombre} · ${t.tipoTrabajador}`}
                      terciario={formatearClp(t.montoClp)}
                      fin={<Badge tono={t.estado === "por_aprobar" ? "info" : t.estado === "aprobado" ? "success" : "danger"}>{t.estado === "por_aprobar" ? "Por aprobar" : t.estado}</Badge>}
                    />
                  </li>
                ))}
              </ul>
            </Estado>
          </div>
        );
        return (
          <>
            <Cabecera titulo="Turnos extra" subtitulo="Aprueba o rechaza los reemplazos y refuerzos pagados de la pauta." />
            <div className={`flex-col gap-3 px-4 pb-3 md:px-0 ${d.turno ? "hidden md:flex" : "flex"}`}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <KpiTile etiqueta="En esta lista" valor={String(d.items.length)} />
                <KpiTile etiqueta="Monto total" valor={d.totalClp} />
              </div>
              <Segmentado
                etiqueta="Estado"
                Link={LinkNext}
                activa={d.estado}
                opciones={ESTADOS.map((e) => ({ id: e.id, etiqueta: e.etiqueta, href: hrefTurnosExtra({ estado: e.id as TurnoExtra["estado"], inst: filtros.inst }) }))}
              />
            </div>
            <SplitScreen
              contenido
              telefono={d.turno ? "detalle" : "lista"}
              etiquetaLista="Turnos"
              etiquetaDetalle="Detalle"
              vacio={{ texto: "Elige un turno de la lista." }}
              lista={lista}
              {...(d.turno ? {
                detalle: (
                  <div className="flex flex-col gap-4 p-4 md:p-0">
                    <Cabecera titulo={d.turno.personaNombre} subtitulo={`${d.turno.fecha} · ${d.turno.instalacionNombre} · ${d.turno.puestoNombre}`} />
                    <AccionesTurno t={d.turno} puedeAprobar={d.puedeAprobar} yoId={d.yoId} />
                  </div>
                ),
              } : {})}
            />
          </>
        );
      }}
    </PaginaPortal>
  );
}