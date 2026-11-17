"use client";

import { useEffect, useState } from "react";

import { Button, Select } from "@opai/ds";

import { useRouter } from "next/navigation";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = {
  atender: boolean;
  gobernar: boolean;
  pendiente: boolean;
  onPausarEmpresa: () => void;
  onReanudarEmpresa: () => void;
  pausadaEmpresa: boolean;
};

export function PausaInstalacion({ atender, gobernar, pendiente, onPausarEmpresa, onReanudarEmpresa, pausadaEmpresa }: Props) {
  const router = useRouter();
  const { ejecutar } = useCapacidad("erp");
  const [instalaciones, setInstalaciones] = useState<{ valor: string; etiqueta: string }[]>([]);
  const [instalacionId, setInstalacionId] = useState("");

  useEffect(() => {
    if (!atender && !gobernar) return;
    void ejecutar<{ items: { id: string; nombre: string }[] }>("core.instalaciones.list", { limite: 200 }).then((r) => {
      if (r?.items) setInstalaciones(r.items.map((i) => ({ valor: i.id, etiqueta: i.nombre })));
    });
  }, [atender, ejecutar, gobernar]);

  if (!atender && !gobernar) return null;

  const pausarInstalacion = async () => {
    if (!instalacionId) return;
    if (await ejecutar("central.agente.pausar", { instalacionId, motivo: "" })) {
      avisar.exito("Agente en pausa en la instalación");
      setInstalacionId("");
      router.refresh();
    }
  };

  const reanudarInstalacion = async () => {
    if (!instalacionId) return;
    if (await ejecutar("central.agente.reanudar", { instalacionId })) {
      avisar.exito("Agente reanudado en la instalación");
      setInstalacionId("");
      router.refresh();
    }
  };

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