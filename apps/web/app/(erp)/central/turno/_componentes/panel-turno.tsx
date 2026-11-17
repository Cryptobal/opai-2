"use client";

import { useState } from "react";

import type { TurnoEstado } from "../../_componentes/tipos-central";
import { SelectorRespaldo } from "./selector-respaldo";
import { BotonesTurno } from "./panel-botones";
import { PanelAgenteCentral } from "./panel-agente";
import { PanelEntregaTurno } from "./panel-entrega";
import { useAccionesTurno } from "./use-acciones-turno";

type Usuario = { userId: string; nombre: string };

type Props = {
  turno: TurnoEstado;
  operador: string | null;
  entregaPara: string | null;
  usuarios: Usuario[];
  gobernar: boolean;
  atender: boolean;
  respaldoId: string;
  configurar: boolean;
  alertasTomadas: number;
  propuestasPendientes: number;
};

export function PanelTurno({
  turno,
  operador,
  entregaPara,
  usuarios,
  gobernar,
  atender,
  respaldoId,
  configurar,
  alertasTomadas,
  propuestasPendientes,
}: Props) {
  const { ejecutar, pendiente, error, run } = useAccionesTurno();
  const [entregaA, setEntregaA] = useState("");
  const [notaEntrega, setNotaEntrega] = useState("");
  const yoOpero = Boolean(turno.turno && operador && turno.turno.operadorId === operador && turno.turno.estado === "abierto");

  return (
    <div className="flex flex-col gap-4">
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      <BotonesTurno
        turno={turno}
        operador={operador}
        entregaPara={entregaPara}
        atender={atender}
        pendiente={pendiente}
        onAbrir={() => run(ejecutar("central.turno.abrir", {}), "Turno abierto")}
        onCerrar={() => run(ejecutar("central.turno.cerrar", {}), "Turno cerrado")}
        onAceptar={() => run(ejecutar("central.turno.aceptar", {}), "Turno aceptado")}
      />
      {yoOpero ? (
        <PanelEntregaTurno
          usuarios={usuarios}
          entregaA={entregaA}
          notaEntrega={notaEntrega}
          pendiente={pendiente}
          alertasTomadas={alertasTomadas}
          propuestasPendientes={propuestasPendientes}
          onEntregaA={setEntregaA}
          onNota={setNotaEntrega}
          onEntregar={() =>
            run(ejecutar("central.turno.entregar", { aUsuarioId: entregaA, nota: notaEntrega }), "Turno entregado")
          }
        />
      ) : null}
      <PanelAgenteCentral
        turno={turno}
        gobernar={gobernar}
        atender={atender}
        pendiente={pendiente}
        onPausar={() => run(ejecutar("central.agente.pausar", { instalacionId: null }), "Agente en pausa")}
        onReanudar={() => run(ejecutar("central.agente.reanudar", { instalacionId: null }), "Agente reanudado")}
      />
      <SelectorRespaldo respaldoId={respaldoId} usuarios={usuarios} puedeEditar={configurar} />
    </div>
  );
}