"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CamposNuevaAlerta } from "./campos-form";

type Inst = { id: string; nombre: string };

export function FormularioNuevaAlerta() {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [instalaciones, setInstalaciones] = useState<Inst[]>([]);
  const [instalacionId, setInstalacionId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState("media");

  useEffect(() => {
    void ejecutar<{ items: { id: string; nombre: string }[] }>("core.instalaciones.list", { limite: 100 }).then((r) => {
      if (r) setInstalaciones(r.items.map((i) => ({ id: i.id, nombre: i.nombre })));
    });
  }, [ejecutar]);

  async function enviar() {
    const r = await ejecutar<{ id: string }>("central.alertas.abrir", { instalacionId, titulo, descripcion, severidad });
    if (!r) return;
    avisar.exito("Alerta abierta");
    router.push(`/central/alertas/${r.id}`);
    router.refresh();
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      <CamposNuevaAlerta
        instalaciones={instalaciones}
        instalacionId={instalacionId}
        titulo={titulo}
        descripcion={descripcion}
        severidad={severidad}
        onInstalacion={setInstalacionId}
        onTitulo={setTitulo}
        onDescripcion={setDescripcion}
        onSeveridad={setSeveridad}
      />
      <Button variant="primary" disabled={pendiente || !instalacionId || titulo.trim().length < 3} onClick={() => void enviar()}>
        Abrir alerta
      </Button>
    </div>
  );
}