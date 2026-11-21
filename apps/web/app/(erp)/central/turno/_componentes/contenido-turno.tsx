import { DetailScreen, Pares } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";

import type { TurnoEstado } from "../../_componentes/tipos-central";

import { PanelTurno } from "./panel-turno";

type Props = {
  turno: { ok: boolean; error?: { code: string } };
  t: TurnoEstado | null;
  operador: string | null;
  entregaPara: string | null;
  lista: { userId: string; nombre: string }[];
  atender: boolean;
  gobernar: boolean;
  respaldo: string;
  operadorNombre: string | null;
  configurar: boolean;
  alertasTomadas: number;
  propuestasPendientes: number;
};

export function ContenidoTurnoCentral(props: Props) {
  const { turno, t, operadorNombre } = props;
  return (
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
            operador={props.operador}
            entregaPara={props.entregaPara}
            usuarios={props.lista}
            gobernar={props.gobernar}
            atender={props.atender}
            respaldoId={props.respaldo}
            configurar={props.configurar}
            alertasTomadas={props.alertasTomadas}
            propuestasPendientes={props.propuestasPendientes}
          />
        </div>
      ) : null}
    </DetailScreen>
  );
}