"use client";

import type { TurnoEstado } from "../../_componentes/tipos-central";

import { PausaInstalacion } from "./pausa-instalacion";

type Props = {
  turno: TurnoEstado;
  gobernar: boolean;
  atender: boolean;
  pendiente: boolean;
  onPausar: () => void;
  onReanudar: () => void;
};

export function PanelAgenteCentral({ turno, gobernar, atender, pendiente, onPausar, onReanudar }: Props) {
  if (!atender && !gobernar) return null;
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <h3 className="t-label text-fg">Agente de central</h3>
      <PausaInstalacion
        atender={atender}
        gobernar={gobernar}
        pendiente={pendiente}
        pausadaEmpresa={turno.pausadaEmpresa}
        onPausarEmpresa={onPausar}
        onReanudarEmpresa={onReanudar}
      />
    </section>
  );
}