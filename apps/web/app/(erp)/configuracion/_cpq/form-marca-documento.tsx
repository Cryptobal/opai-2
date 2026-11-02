"use client";

import { Button, Campo, Select, Textarea } from "@opai/ds";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ejecutar } from "@/lib/capacidades-cliente";

const TIPOGRAFIAS = [
  { value: "inter", label: "Inter (sans)" },
  { value: "helvetica", label: "Helvetica (sans)" },
  { value: "times", label: "Times (serif)" },
];

export function FormMarcaDocumento({
  marca,
}: {
  marca: {
    tipografia: string;
    piePagina: string | null;
    condicionesDefault: string | null;
  };
}) {
  const router = useRouter();
  const [tipografia, setTipografia] = useState(marca.tipografia);
  const [pie, setPie] = useState(marca.piePagina ?? "");
  const [condiciones, setCondiciones] = useState(marca.condicionesDefault ?? "");
  const [cargando, setCargando] = useState(false);

  async function guardar() {
    setCargando(true);
    const r = await ejecutar("cpq.marca_documento.update", {
      tipografia,
      piePagina: pie.trim() || null,
      condicionesDefault: condiciones.trim() || null,
    });
    setCargando(false);
    if (r.ok) router.refresh();
  }

  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <Campo etiqueta="Tipografía del PDF" htmlFor="cpq-doc-tipografia">
        <Select
          id="cpq-doc-tipografia"
          value={tipografia}
          onValueChange={setTipografia}
          opciones={TIPOGRAFIAS}
        />
      </Campo>
      <Campo etiqueta="Pie de página" htmlFor="cpq-doc-pie">
        <Textarea id="cpq-doc-pie" value={pie} onChange={(e) => setPie(e.target.value)} rows={2} />
      </Campo>
      <Campo etiqueta="Condiciones comerciales por defecto" htmlFor="cpq-doc-cond">
        <Textarea
          id="cpq-doc-cond"
          value={condiciones}
          onChange={(e) => setCondiciones(e.target.value)}
          rows={4}
        />
      </Campo>
      <Button type="submit" disabled={cargando}>
        Guardar marca documental
      </Button>
    </form>
  );
}
