"use client";

import { Campo, Input, Select, Textarea } from "@opai/ds";

import { SEVERIDADES, ETIQUETA_SEVERIDAD } from "../../_componentes/tipos-central";

type Inst = { id: string; nombre: string };

type Props = {
  instalaciones: Inst[];
  instalacionId: string;
  titulo: string;
  descripcion: string;
  severidad: string;
  onInstalacion: (v: string) => void;
  onTitulo: (v: string) => void;
  onDescripcion: (v: string) => void;
  onSeveridad: (v: string) => void;
};

export function CamposNuevaAlerta({
  instalaciones,
  instalacionId,
  titulo,
  descripcion,
  severidad,
  onInstalacion,
  onTitulo,
  onDescripcion,
  onSeveridad,
}: Props) {
  return (
    <>
      <Campo etiqueta="Instalación">
        <Select
          valor={instalacionId}
          onCambiar={onInstalacion}
          opciones={[{ valor: "", etiqueta: "Elegir instalación" }, ...instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre }))]}
        />
      </Campo>
      <Campo etiqueta="Título">
        <Input value={titulo} onChange={(e) => onTitulo(e.target.value)} />
      </Campo>
      <Campo etiqueta="Descripción">
        <Textarea value={descripcion} onChange={(e) => onDescripcion(e.target.value)} rows={3} />
      </Campo>
      <Campo etiqueta="Severidad">
        <Select
          valor={severidad}
          onCambiar={onSeveridad}
          opciones={SEVERIDADES.map((s) => ({ valor: s, etiqueta: ETIQUETA_SEVERIDAD[s] ?? s }))}
        />
      </Campo>
    </>
  );
}