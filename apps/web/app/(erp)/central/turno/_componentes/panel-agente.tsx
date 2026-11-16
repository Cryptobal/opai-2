"use client";

import { Button } from "@opai/ds";

import type { TurnoEstado } from "../../_componentes/tipos-central";

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
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente} onClick={onPausar}>
          Pausar en toda la empresa
        </Button>
        {gobernar && turno.pausadaEmpresa ? (
          <Button variant="primary" disabled={pendiente} onClick={onReanudar}>
            Reanudar en toda la empresa
          </Button>
        ) : null}
      </div>
    </section>
  );
}