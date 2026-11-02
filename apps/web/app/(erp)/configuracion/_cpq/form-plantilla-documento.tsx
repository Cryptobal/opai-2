"use client";

import { Button, Campo, Checkbox, Select } from "@opai/ds";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ejecutar } from "@/lib/capacidades-cliente";

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
  const [base, setBase] = useState(plantilla.base);
  const [bloques, setBloques] = useState(plantilla.bloques);
  const [cargando, setCargando] = useState(false);

  async function guardar() {
    setCargando(true);
    const r = await ejecutar("cpq.plantillas_documento.update", {
      base,
      bloques: bloques.map((b) => ({ id: b.id, activo: b.activo })),
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
      <Campo etiqueta="Plantilla base" htmlFor="cpq-plantilla-base">
        <Select
          id="cpq-plantilla-base"
          value={base}
          onValueChange={setBase}
          opciones={plantilla.basesDisponibles.map((b) => ({
            value: b,
            label: b.charAt(0).toUpperCase() + b.slice(1),
          }))}
        />
      </Campo>
      <div className="space-y-2">
        <p className="t-label-sm">Bloques visibles (orden fijo)</p>
        {bloques.map((b, i) => (
          <Checkbox
            key={b.id}
            checked={b.activo}
            onCheckedChange={(v) => {
              setBloques((prev) =>
                prev.map((x, j) => (j === i ? { ...x, activo: Boolean(v) } : x)),
              );
            }}
            label={ETIQUETAS_BLOQUE[b.id] ?? b.id}
          />
        ))}
      </div>
      <Button type="submit" disabled={cargando}>
        Guardar plantilla
      </Button>
    </form>
  );
}
