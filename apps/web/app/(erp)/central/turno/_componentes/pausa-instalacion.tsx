"use client";

import { Button, Select } from "@opai/ds";

import { usePausaInstalacion } from "./use-pausa-instalacion";

type Props = {
  atender: boolean;
  gobernar: boolean;
  pendiente: boolean;
  onPausarEmpresa: () => void;
  onReanudarEmpresa: () => void;
  pausadaEmpresa: boolean;
};

export function PausaInstalacion({ atender, gobernar, pendiente, onPausarEmpresa, onReanudarEmpresa, pausadaEmpresa }: Props) {
  const { instalaciones, instalacionId, setInstalacionId, pausarInstalacion, reanudarInstalacion } = usePausaInstalacion(
    atender,
    gobernar,
  );

  if (!atender && !gobernar) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente} onClick={onPausarEmpresa}>
          Pausar en toda la empresa
        </Button>
        {gobernar && pausadaEmpresa ? (
          <Button variant="primary" disabled={pendiente} onClick={onReanudarEmpresa}>
            Reanudar en toda la empresa
          </Button>
        ) : null}
      </div>
      {instalaciones.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Select
            valor={instalacionId}
            onCambiar={setInstalacionId}
            opciones={[{ valor: "", etiqueta: "Elegir instalación" }, ...instalaciones]}
          />
          {atender ? (
            <Button variant="secondary" disabled={pendiente || !instalacionId} onClick={() => void pausarInstalacion()}>
              Pausar en instalación
            </Button>
          ) : null}
          {gobernar ? (
            <Button variant="secondary" disabled={pendiente || !instalacionId} onClick={() => void reanudarInstalacion()}>
              Reanudar en instalación
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}