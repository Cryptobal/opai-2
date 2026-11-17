import { DetailScreen, Pares } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";

import { cargarPantallaTurno } from "./_componentes/datos-turno";
import { PanelTurno } from "./_componentes/panel-turno";

export const metadata = { title: "Turno de central" };

/** Turno de central y control del agente (modulos/central.md §3, CAR-521). */
export default function TurnoCentral() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Turno de central"
      ruta="/central/turno"
      volver={{ href: "/central", etiqueta: "Central" }}
      cargar={cargarPantallaTurno}
    >
      {({
        turno,
        t,
        operador,
        entregaPara,
        lista,
        atender,
        gobernar,
        respaldo,
        operadorNombre,
        configurar,
        alertasTomadas,
        propuestasPendientes,
      }) => (
        <DetailScreen state={estadoPantalla(turno)} titulo="Turno de central" subtitulo="Quién está a cargo y si el agente puede actuar">
          {t ? (
            <div className="flex flex-col gap-4">
              <Pares
                items={[
                  {
                    etiqueta: "Estado del turno",
                    valor: t.turno ? (t.turno.estado === "abierto" ? "Abierto" : "En entrega") : "Sin turno abierto",
                  },
                  ...(operadorNombre ? [{ etiqueta: "Operador", valor: operadorNombre }] : []),
                  {
                    etiqueta: "Agente",
                    valor: t.pausadaEmpresa
                      ? "En pausa (empresa)"
                      : t.instalacionesPausadas > 0
                        ? `En pausa en ${t.instalacionesPausadas} instalaciones`
                        : "Activo",
                  },
                ]}
              />
              <PanelTurno
                turno={t}
                operador={operador}
                entregaPara={entregaPara}
                usuarios={lista}
                gobernar={gobernar}
                atender={atender}
                respaldoId={respaldo}
                configurar={configurar}
                alertasTomadas={alertasTomadas}
                propuestasPendientes={propuestasPendientes}
              />
            </div>
          ) : null}
        </DetailScreen>
      )}
    </PaginaPortal>
  );
}