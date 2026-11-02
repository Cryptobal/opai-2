"use client";

import { Button, Campo, Select, Textarea } from "@opai/ds";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";

const TIPOGRAFIAS = [
  { valor: "inter", etiqueta: "Inter (sans)" },
  { valor: "helvetica", etiqueta: "Helvetica (sans)" },
  { valor: "times", etiqueta: "Times (serif)" },
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
  const { ejecutar, pendiente: capPendiente } = useCapacidad("erp");
  const [tipografia, setTipografia] = useState(marca.tipografia);
  const [pie, setPie] = useState(marca.piePagina ?? "");
  const [condiciones, setCondiciones] = useState(marca.condicionesDefault ?? "");
  async function guardar() {
    const r = await ejecutar("cpq.marca_documento.update", {
      tipografia,
      piePagina: pie.trim() || null,
      condicionesDefault: condiciones.trim() || null,
    });
    if (r != null) router.refresh();
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
          valor={tipografia}
          onCambiar={setTipografia}
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
      <Button type="submit" disabled={capPendiente}>
        Guardar marca documental
      </Button>
    </form>
  );
}
