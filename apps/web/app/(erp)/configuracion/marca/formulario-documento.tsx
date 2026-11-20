"use client";

import { Campo, Select, Textarea } from "@opai/ds";
import { useState } from "react";

const TIPOGRAFIAS = [
  { valor: "inter", etiqueta: "Inter (sans)" },
  { valor: "helvetica", etiqueta: "Helvetica (sans)" },
  { valor: "times", etiqueta: "Times (serif)" },
];

type Props = {
  tipografia: string;
  piePagina: string | null;
  condicionesDefault: string | null;
  puede: boolean;
  onCambio: (v: {
    documentoTipografia?: string;
    documentoPiePagina?: string | null;
    documentoCondicionesDefault?: string | null;
  }) => void;
};

/** Tipografía, pie y condiciones por defecto en PDF (cotizaciones y propuestas). */
export function FormularioDocumentoMarca({
  tipografia,
  piePagina,
  condicionesDefault,
  puede,
  onCambio,
}: Props) {
  const [tip, setTip] = useState(tipografia);
  const [pie, setPie] = useState(piePagina ?? "");
  const [cond, setCond] = useState(condicionesDefault ?? "");
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Tipografía del PDF" htmlFor="marca-doc-tipografia">
        <Select
          id="marca-doc-tipografia"
          valor={tip}
          disabled={!puede}
          opciones={TIPOGRAFIAS}
          onCambiar={(v) => {
            setTip(v);
            onCambio({ documentoTipografia: v });
          }}
        />
      </Campo>
      <Campo etiqueta="Pie de página" htmlFor="marca-doc-pie">
        <Textarea
          id="marca-doc-pie"
          value={pie}
          disabled={!puede}
          rows={2}
          onChange={(e) => {
            setPie(e.target.value);
            onCambio({ documentoPiePagina: e.target.value.trim() || null });
          }}
        />
      </Campo>
      <Campo etiqueta="Condiciones comerciales por defecto" htmlFor="marca-doc-cond">
        <Textarea
          id="marca-doc-cond"
          value={cond}
          disabled={!puede}
          rows={4}
          onChange={(e) => {
            setCond(e.target.value);
            onCambio({ documentoCondicionesDefault: e.target.value.trim() || null });
          }}
        />
      </Campo>
    </div>
  );
}