"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export function usePausaInstalacion(atender: boolean, gobernar: boolean) {
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

  async function pausarInstalacion() {
    if (!instalacionId) return;
    if (await ejecutar("central.agente.pausar", { instalacionId, motivo: "" })) {
      avisar.exito("Agente en pausa en la instalación");
      setInstalacionId("");
      router.refresh();
    }
  }

  async function reanudarInstalacion() {
    if (!instalacionId) return;
    if (await ejecutar("central.agente.reanudar", { instalacionId })) {
      avisar.exito("Agente reanudado en la instalación");
      setInstalacionId("");
      router.refresh();
    }
  }

  return { instalaciones, instalacionId, setInstalacionId, pausarInstalacion, reanudarInstalacion };
}