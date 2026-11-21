"use client";

import { formatearFechaHora } from "@opai/domain";
import { Button } from "@opai/ds";

import { diaOperativoChile, textoEvacuacion, type SnapshotEvacuacion } from "@/lib/terreno/evacuacion";

type Props = { copia: SnapshotEvacuacion | null; enLinea: boolean };

export function ExportarEvacuacion({ copia, enLinea }: Props) {
  if (!copia?.items.length) return null;

  const exportar = async () => {
    const texto = textoEvacuacion(copia);
    const nombre = `evacuacion-${diaOperativoChile()}.txt`;
    const archivo = new File([texto], nombre, { type: "text/plain;charset=utf-8" });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Lista de evacuación", files: [archivo] });
        return;
      } catch {
        /* cancelado o no disponible */
      }
    }
    const url = URL.createObjectURL(archivo);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hora = formatearFechaHora(new Date(copia.sincronizadoEn));

  return (
    <section aria-label="Lista de evacuación" className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-4">
      <h2 className="t-heading text-fg">Evacuación</h2>
      <p className="text-sm text-fg-muted">
        {enLinea
          ? `Última copia en este teléfono: ${hora} (${copia.items.length} en sitio).`
          : `Sin conexión: ves la última copia sincronizada (${hora}, ${copia.items.length} en sitio).`}
      </p>
      <Button type="button" variant="secondary" onClick={() => void exportar()}>
        Exportar o compartir lista
      </Button>
    </section>
  );
}