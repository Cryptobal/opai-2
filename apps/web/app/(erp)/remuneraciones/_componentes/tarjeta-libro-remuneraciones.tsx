"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Card } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { descargarBinario } from "./descargar";

type Archivo = { nombre: string; mime: string; base64: string; filas: number; errores: { mensaje: string }[] };

type Props = { periodoId: string };

/** Libro de remuneraciones en PDF y Excel (diseño 06). */
export function TarjetaLibroRemuneraciones({ periodoId }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [aviso, setAviso] = useState<string | null>(null);
  const trasDescarga = (r: Archivo, etiqueta: string) => {
    if (r.filas === 0) {
      setAviso("No hay filas para exportar. Calcula las liquidaciones y corrige los errores del período.");
      return;
    }
    descargarBinario(r.nombre, r.mime, r.base64);
    avisar.exito(`${etiqueta} descargado · ${r.filas} personas`);
    setAviso(r.errores.length ? `${r.errores.length} personas quedaron fuera del libro (mismas reglas que el LRE).` : null);
  };
  const pdf = async () => {
    const r = await ejecutar<Archivo>("nomina.libro_remuneraciones.pdf", { periodoId });
    if (r) trasDescarga(r, "PDF");
  };
  const excel = async () => {
    const r = await ejecutar<Archivo>("nomina.libro_remuneraciones.excel", { periodoId });
    if (r) trasDescarga(r, "Excel");
  };
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-subheading">Libro de remuneraciones</span>
          <Badge tono="info" punto>Informe</Badge>
        </div>
        <span className="t-body-sm text-fg-muted">PDF y Excel con las mismas cifras por persona que el LRE · para archivo interno y DT.</span>
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : aviso ? <Alerta tono="warning" titulo={aviso} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente} onClick={() => void pdf()}>
          <Download aria-hidden className="size-4" />
          PDF
        </Button>
        <Button variant="secondary" disabled={pendiente} onClick={() => void excel()}>
          <Download aria-hidden className="size-4" />
          Excel
        </Button>
      </div>
    </Card>
  );
}