import { Badge, DetailScreen, Seccion } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { identidadActual } from "@/lib/servidor";

import {
  cargarCargos,
  cargarOpciones,
  cargarResultadoCargo,
  cargarScorecard,
} from "../../_componentes/datos";
import { type DefinicionIndicador, mesCorto } from "../../_componentes/tipos";
import { EditarScorecard } from "./_componentes/editar-scorecard";
import { Equipo } from "./_componentes/equipo";
import { Jefatura } from "./_componentes/jefatura";
import { TablaScorecard } from "./_componentes/tabla-scorecard";

export const metadata = { title: "Scorecard del cargo" };
type Props = { params: Promise<{ id: string }> };

/** Scorecard de un cargo (ADR-094, CAR-307): indicadores, metas y pesos, jefatura y equipo. */
export default function ScorecardCargo({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Scorecard del cargo"
      ruta="/desempeno"
      cargar={async () => {
        const [{ id: crudo }, identidad] = await Promise.all([params, identidadActual()]);
        const id = requerirUuid(crudo);
        const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
        const editaScorecard = puede("desempeno:scorecards.manage");
        // El catálogo solo hace falta para editar; los cargos, para mostrar o cambiar la jefatura.
        const [r, equipo, opciones, cargos] = await Promise.all([
          cargarScorecard(id),
          cargarResultadoCargo(id),
          editaScorecard ? cargarOpciones() : [],
          cargarCargos(),
        ]);
        requerirEncontrado(r);
        return {
          id,
          r,
          equipo,
          opciones,
          cargos: cargos.ok ? cargos.data : null,
          nombre: r.ok ? r.data.cargo : "Cargo",
          editaScorecard,
          editaJefatura: puede("core:estructuras.manage"),
        };
      }}
      opciones={({ nombre }) => ({ titulo: nombre })}
    >
      {({ id, r, equipo, opciones, cargos, nombre, editaScorecard, editaJefatura }) => {
        const vigente = r.ok ? r.data.vigente : null;
        const pendiente = r.ok ? r.data.pendiente : null;
        const mapa = (ds: DefinicionIndicador[]) => new Map(ds.map((d) => [d.indicador, d]));
        const nombres = mapa(r.ok ? r.data.definiciones : []);
        const nombresPendiente = mapa(r.ok ? r.data.definicionesPendiente : []);
        return (
          <DetailScreen
            state={estadoPantalla(r)}
            titulo={nombre}
            subtitulo={r.ok ? `Gestión de ${mesCorto(r.data.periodo)}` : undefined}
            estado={
              vigente ? (
                <Badge tono="success">Vigente desde {mesCorto(vigente.vigenteDesde)}</Badge>
              ) : (
                <Badge tono="neutro">Sin scorecard</Badge>
              )
            }
            acciones={
              editaScorecard && r.ok ? (
                <EditarScorecard
                  cargoId={id}
                  base={pendiente ?? vigente}
                  soloPublicar={pendiente?.estado === "publicado"}
                  opciones={opciones}
                />
              ) : undefined
            }
          >
            <div className="flex flex-col gap-6">
              <Seccion titulo="Scorecard vigente">
                {vigente ? (
                  <TablaScorecard scorecard={vigente} nombres={nombres} />
                ) : (
                  <p className="t-body-sm text-fg-muted">
                    Este cargo todavía no tiene indicadores. Sin scorecard no se calcula el
                    resultado de sus personas.
                  </p>
                )}
              </Seccion>
              {pendiente ? (
                <Seccion
                  titulo={
                    pendiente.estado === "borrador"
                      ? "Borrador sin publicar"
                      : `Cambio publicado, rige desde ${mesCorto(pendiente.vigenteDesde)}`
                  }
                >
                  <TablaScorecard scorecard={pendiente} nombres={nombresPendiente} />
                </Seccion>
              ) : null}
              {cargos ? <Jefatura cargoId={id} cargos={cargos} editable={editaJefatura} /> : null}
              <Seccion titulo="Equipo">
                <Equipo resultado={equipo} />
              </Seccion>
            </div>
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}
