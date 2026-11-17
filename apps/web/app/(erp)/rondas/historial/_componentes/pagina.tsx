import { Badge, Cabecera, Estado, FilaSeleccionable, KpiTile, Segmentado, SplitScreen, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros } from "@/lib/parametros";

import { cargarHistorial } from "./datos";
import { ESTADOS, etiquetaEstado, hrefHistorial, RUTA_HISTORIAL, tonoEstado } from "./tipos";

type Q = Record<string, string | string[] | undefined>;

function filaHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export function PaginaHistorialRondas({ searchParams }: { searchParams: Promise<Q> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Historial de rondas"
      ruta={RUTA_HISTORIAL}
      cargando="lista"
      cargar={async () => cargarHistorial(await leerParametros(searchParams))}
    >
      {(d) => {
        const filtros = {
          estado: d.estado,
          ...(d.instalacionId ? { inst: d.instalacionId } : {}),
          ...(d.desde ? { desde: d.desde } : {}),
          ...(d.hasta ? { hasta: d.hasta } : {}),
        };
        const lista = (
          <div className="flex flex-col p-4 md:p-0">
            <Estado
              state={d.items.length ? "ready" : "empty"}
              variante="lista"
              textos={{
                vacio: {
                  titulo: "No hay rondas en este filtro",
                  descripcion: "Ajusta la instalación, las fechas o el estado.",
                },
              }}
            >
              <ul>
                {d.items.map((t) => (
                  <li key={t.id}>
                    <FilaSeleccionable
                      Link={LinkNext}
                      href={hrefHistorial({ ...filtros, ver: t.id })}
                      seleccionada={t.id === d.ver}
                      titulo={`${filaHora(t.horaInicio)} · ${t.plantillaNombre}`}
                      secundario={`${t.instalacionNombre}${t.adhoc ? " · Ad hoc" : ""}`}
                      terciario={`${t.puntosMarcados}/${t.puntosObligatorios} puntos${t.anomalias ? ` · ${t.anomalias} anomalías` : ""}`}
                      fin={<Badge tono={tonoEstado(t.estado)}>{etiquetaEstado(t.estado)}</Badge>}
                    />
                  </li>
                ))}
              </ul>
            </Estado>
          </div>
        );
        return (
          <>
            <Cabecera titulo="Historial de rondas" subtitulo="Rondas realizadas y programadas no iniciadas por instalación." />
            <div className={`flex-col gap-3 px-4 pb-3 md:px-0 ${d.ejecucion ? "hidden md:flex" : "flex"}`}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <KpiTile etiqueta="En esta lista" valor={String(d.items.length)} />
                <KpiTile
                  etiqueta="Con anomalías"
                  valor={String(d.items.filter((i) => i.anomalias > 0).length)}
                />
              </div>
              <Segmentado
                etiqueta="Estado"
                Link={LinkNext}
                activa={d.estado}
                opciones={ESTADOS.map((e) => ({
                  id: e.id,
                  etiqueta: e.etiqueta,
                  href: hrefHistorial({ ...filtros, estado: e.id }),
                }))}
              />
            </div>
            <SplitScreen
              contenido
              telefono={d.ejecucion ? "detalle" : "lista"}
              etiquetaLista="Rondas"
              etiquetaDetalle="Detalle"
              vacio={{ texto: "Elige una ronda de la lista." }}
              lista={lista}
              {...(d.ejecucion
                ? {
                    detalle: (
                      <div className="flex flex-col gap-4 p-4 md:p-0">
                        <Cabecera
                          titulo={d.ejecucion.plantillaNombre}
                          subtitulo={`${d.ejecucion.instalacionNombre} · ${etiquetaEstado(d.ejecucion.estado)}`}
                        />
                        {d.ejecucion.id.startsWith("nr:") ? (
                          <p className="t-body muted">La ronda programada no se inició dentro de la ventana.</p>
                        ) : (
                          <Table aria-label="Marcas de la ronda">
                            <thead>
                              <tr>
                                <Th>Punto</Th>
                                <Th>Hora</Th>
                                <Th>Geocerca</Th>
                                <Th>Anomalías</Th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.ejecucion.marcas.map((m) => (
                                <Tr key={m.id}>
                                  <Td>{m.puntoNombre}</Td>
                                  <Td>{filaHora(m.hora)}</Td>
                                  <Td>{m.geocerca}</Td>
                                  <Td>{m.anomalias.length ? m.anomalias.join(", ") : "—"}</Td>
                                </Tr>
                              ))}
                            </tbody>
                          </Table>
                        )}
                      </div>
                    ),
                  }
                : {})}
            />
          </>
        );
      }}
    </PaginaPortal>
  );
}