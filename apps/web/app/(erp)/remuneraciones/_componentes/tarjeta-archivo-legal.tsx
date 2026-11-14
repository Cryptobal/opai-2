"use client";

import { Download, FileCheck } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Card } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type ArchivoLegal, ResultadoArchivo } from "./resultado-archivo";

type Archivo = ArchivoLegal;

const TEXTOS = {
  lre: { titulo: "Libro de Remuneraciones Electrónico (LRE)", desc: "Carga mensual en Mi DT · separador «;» y encabezados del suplemento", tipo: "text/csv" },
  previred: { titulo: "Previred · cotizaciones", desc: "AFP, SIS, salud, seguro de cesantía y mutual por persona · 105 campos", tipo: "text/plain" },
} as const;

function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: `${tipo};charset=utf-8` }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Un archivo legal del período (diseño 06): validar, ver los errores y descargar cuando no hay errores. */
export function TarjetaArchivoLegal({ periodoId, tipo }: { periodoId: string; tipo: "lre" | "previred" }) {
  const t = TEXTOS[tipo];
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [archivo, setArchivo] = useState<Archivo | null>(null);
  async function validar() {
    // Ids literales: el escáner de paridad verifica cada capacidad que llama la pantalla.
    const r = tipo === "lre"
      ? await ejecutar<Archivo>("nomina.lre.generar", { periodoId })
      : await ejecutar<Archivo>("nomina.previred.generar", { periodoId });
    if (r) setArchivo(r);
  }
  const conErrores = archivo !== null && archivo.errores.length > 0;
  const listo = archivo !== null && !conErrores && archivo.filas > 0;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-subheading">{t.titulo}</span>
          {archivo ? (
            <Badge tono={conErrores ? "danger" : "success"} punto>{conErrores ? "Con errores" : "Validado"}</Badge>
          ) : (
            <Badge tono="neutro" punto>Sin validar</Badge>
          )}
          <Badge tono="neutro">Formato por verificar</Badge>
        </div>
        <span className="t-body-sm text-fg-muted">{t.desc}</span>
        {archivo ? <span className="t-mono t-body-sm">{archivo.nombre}</span> : null}
      </div>
      {archivo ? <ResultadoArchivo archivo={archivo} tipo={tipo} /> : null}
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente} onClick={() => void validar()}>
          <FileCheck aria-hidden className="size-4" />
          {archivo ? "Validar de nuevo" : "Validar"}
        </Button>
        <Button
          variant="secondary"
          disabled={!listo}
          onClick={() => {
            if (!archivo) return;
            descargar(archivo.nombre, archivo.contenido, t.tipo);
            avisar.exito(`Archivo descargado: ${archivo.filas} personas`);
          }}
        >
          <Download aria-hidden className="size-4" />
          Descargar
        </Button>
      </div>
    </Card>
  );
}
