import { Badge, BarraProgreso, DetailScreen, Seccion } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";

import { cargarResultadoPersona, tonoPuntaje } from "../../_componentes/datos";
import { conUnidad, mesCorto } from "../../_componentes/tipos";

export const metadata = { title: "Resultado de la persona" };
type Props = { params: Promise<{ id: string }> };

const TONO_BARRA = {
  success: "accent",
  warning: "warning",
  danger: "danger",
  neutro: "neutro",
} as const;

/** Resultado de gestión de una persona en el mes (ADR-094, CAR-307): puntaje y detalle por indicador. */
export default function ResultadoPersona({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Resultado de la persona"
      ruta="/desempeno"
      cargar={async () => {
        const r = await cargarResultadoPersona(requerirUuid((await params).id));
        requerirEncontrado(r);
        return { r };
      }}
      opciones={({ r }) => ({
        titulo: r.ok ? `${r.data.nombres} ${r.data.apellidos}` : "Resultado de la persona",
      })}
    >
      {({ r }) => {
        const d = r.ok ? r.data : null;
        return (
          <DetailScreen
            state={estadoPantalla(r)}
            titulo={d ? `${d.nombres} ${d.apellidos}` : "Resultado de la persona"}
            subtitulo={d ? `Gestión de ${mesCorto(d.periodo)}` : undefined}
            estado={
              d ? (
                <Badge tono={tonoPuntaje(d.puntaje)}>
                  {d.puntaje === null ? "Sin datos" : `${Math.round(d.puntaje)} pts`}
                </Badge>
              ) : undefined
            }
          >
            {d ? (
              <div className="flex flex-col gap-6">
                {d.vigenteDesde === null ? (
                  <p className="t-body-sm text-fg-muted">
                    Su cargo no tiene scorecard este mes, así que no hay resultado que mostrar.
                  </p>
                ) : (
                  <>
                    <p className="t-body-sm text-fg-muted">
                      100 puntos es cumplir todas las metas; el máximo es 120.
                      {d.cobertura < 100
                        ? ` Este mes hay datos para el ${Math.round(d.cobertura)} % del scorecard.`
                        : ""}
                    </p>
                    {d.parteAgente && d.parteAgente.porAgente > 0 ? (
                      <p className="t-body-sm text-fg-muted">
                        Su agente hizo el {d.parteAgente.porcentaje.toLocaleString("es-CL")} % de sus
                        acciones del mes ({d.parteAgente.porAgente} de {d.parteAgente.acciones}). El
                        resultado sigue siendo de la persona.
                      </p>
                    ) : null}
                    <Seccion titulo="Indicadores">
                      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                        {d.indicadores.map((i) => {
                          const pts = i.logro === null ? null : Math.round(i.logro * 100);
                          return (
                            <li
                              key={i.indicador}
                              className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0"
                            >
                              <span className="flex items-start justify-between gap-3">
                                <span className="text-base font-medium text-fg">{i.nombre}</span>
                                <Badge tono={tonoPuntaje(pts)}>
                                  {pts === null ? "Sin datos" : `${pts} %`}
                                </Badge>
                              </span>
                              {pts !== null ? (
                                <BarraProgreso
                                  valor={pts / 120}
                                  etiqueta={`Logro de ${i.nombre}`}
                                  tono={TONO_BARRA[tonoPuntaje(pts) as keyof typeof TONO_BARRA]}
                                />
                              ) : null}
                              <span className="t-caption">
                                {i.valor === null
                                  ? i.disponible
                                    ? "Sin hechos este mes"
                                    : "Indicador no disponible"
                                  : conUnidad(i.valor, i.unidad)}{" "}
                                · Meta {conUnidad(i.meta, i.unidad)} · Peso {i.peso} %
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </Seccion>
                  </>
                )}
              </div>
            ) : null}
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}
