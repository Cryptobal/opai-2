"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { avisar, Button, Campo, Input, Select, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { SEVERIDADES, ETIQUETA_SEVERIDAD } from "../../_componentes/datos";

type Inst = { id: string; nombre: string };

export function FormularioNuevaAlerta() {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [instalaciones, setInstalaciones] = useState<Inst[]>([]);
  const [instalacionId, setInstalacionId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState<string>("media");

  useEffect(() => {
    void ejecutar<{ items: { id: string; nombre: string }[] }>("core.instalaciones.list", { limite: 100 }).then((r) => {
      if (r) setInstalaciones(r.items.map((i) => ({ id: i.id, nombre: i.nombre })));
    });
  }, [ejecutar]);

  async function enviar() {
    const r = await ejecutar<{ id: string }>("central.alertas.abrir", {
      instalacionId,
      titulo,
      descripcion,
      severidad,
    });
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
      <Campo etiqueta="Instalación">
        <Select
          valor={instalacionId}
          onCambiar={(v) => setInstalacionId(v)}
          opciones={[{ valor: "", etiqueta: "Elegir instalación" }, ...instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre }))]}
        />
      </Campo>
      <Campo etiqueta="Título">
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </Campo>
      <Campo etiqueta="Descripción">
        <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} />
      </Campo>
      <Campo etiqueta="Severidad">
        <Select
          valor={severidad}
          onCambiar={setSeveridad}
          opciones={SEVERIDADES.map((s) => ({ valor: s, etiqueta: ETIQUETA_SEVERIDAD[s] ?? s }))}
        />
      </Campo>
      <Button variant="primary" disabled={pendiente || !instalacionId || titulo.trim().length < 3} onClick={() => void enviar()}>
        Abrir alerta
      </Button>
    </div>
  );
}