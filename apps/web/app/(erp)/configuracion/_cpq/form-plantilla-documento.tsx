"use client";

import { Button, Campo, Checkbox, Select } from "@opai/ds";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { etiquetaBasePlantillaCpq } from "@/lib/cpq-plantilla-presentacion";

const ETIQUETAS_BLOQUE: Record<string, string> = {
  encabezado: "Encabezado y código",
  datos_empresa: "Datos de la empresa",
  resumen_comercial: "Resumen comercial",
  detalle_secciones: "Detalle por sección",
  condiciones: "Condiciones",
  pie: "Pie de página",
};

export function FormPlantillaDocumento({
  plantilla,
}: {
  plantilla: {
    base: string;
    bloques: { id: string; activo: boolean }[];
    basesDisponibles: string[];
  };
}) {
  const router = useRouter();
  const { ejecutar, pendiente: capPendiente } = useCapacidad("erp");
  const [base, setBase] = useState(plantilla.base);
  const [bloques, setBloques] = useState(plantilla.bloques);
  async function guardar() {
    const r = await ejecutar("cpq.plantillas_documento.update", {
      base,
      bloques: bloques.map((b) => ({ id: b.id, activo: b.activo })),
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
      <Campo etiqueta="Plantilla base" htmlFor="cpq-plantilla-base">
        <Select
          id="cpq-plantilla-base"
          valor={base}
          onCambiar={setBase}
          opciones={plantilla.basesDisponibles.map((b) => ({
            valor: b,
            etiqueta: etiquetaBasePlantillaCpq(b),
          }))}
        />
      </Campo>
      <div className="space-y-2">
        <p className="t-label-sm">Bloques visibles (orden fijo)</p>
        {bloques.map((b, i) => (
          <Checkbox
            key={b.id}
            etiqueta={ETIQUETAS_BLOQUE[b.id] ?? b.id}
            marcado={b.activo}
            onCambiar={(v) => {
              setBloques((prev) =>
                prev.map((x, j) => (j === i ? { ...x, activo: v } : x)),
              );
            }}
          />
        ))}
      </div>
      <Button type="submit" disabled={capPendiente}>
        Guardar plantilla
      </Button>
    </form>
  );
}
