"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

import { avisar, type ItemMenu, Menu } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = {
  instalacionId: string;
  anio: number;
  mes: number;
  fecha: string;
  diaria: boolean;
  sinCubrir: boolean;
};

function descargar(nombre: string, mime: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exporta la pauta de la instalación vía `pauta.exportar` (Excel CSV o PDF). */
export function ExportarPauta({ instalacionId, anio, mes, fecha, diaria, sinCubrir }: Props) {
  const { ejecutar, pendiente } = useCapacidad("erp");

  async function exportar(formato: "excel" | "pdf") {
    const input = diaria
      ? { instalacionId, fecha, formato, sinCubrir: sinCubrir || undefined }
      : { instalacionId, anio, mes, formato, sinCubrir: sinCubrir || undefined };
    const r = await ejecutar<{ nombre: string; mime: string; base64: string }>("pauta.exportar", input);
    if (r) {
      descargar(r.nombre, r.mime, r.base64);
      avisar.exito("Archivo descargado");
    }
  }

  const items: ItemMenu[] = [
    {
      id: "excel",
      etiqueta: "Excel (CSV)",
      icono: FileSpreadsheet,
      deshabilitado: pendiente,
      onSelect: () => void exportar("excel"),
    },
    {
      id: "pdf",
      etiqueta: "PDF",
      icono: FileText,
      deshabilitado: pendiente,
      onSelect: () => void exportar("pdf"),
    },
  ];

  return (
    <Menu
      etiqueta="Exportar pauta"
      disparador={<span className="t-label px-2">Exportar</span>}
      claseDisparador="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-2 text-fg hover:bg-fill"
      items={items}
    />
  );
}
