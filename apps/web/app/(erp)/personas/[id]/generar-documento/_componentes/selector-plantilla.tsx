"use client";

import { useRouter } from "next/navigation";

import { Campo, Select } from "@opai/ds";

/** Elige la plantilla del documento; la elección viaja en la URL para que la vista previa se arme en el servidor. */
export function SelectorPlantilla({
  actual,
  opciones,
}: {
  actual: string;
  opciones: readonly { valor: string; etiqueta: string }[];
}) {
  const router = useRouter();
  return (
    <Campo etiqueta="Plantilla">
      <Select
        aria-label="Plantilla"
        valor={actual}
        placeholder="Elige una plantilla"
        onCambiar={(v) => router.replace(`?plantilla=${encodeURIComponent(v)}`, { scroll: false })}
        opciones={[...opciones]}
      />
    </Campo>
  );
}
