"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Card } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type ArchivoLegal, ResultadoArchivo } from "./resultado-archivo";

type Props = { periodoId: string; periodoEstado: string };

function descargar(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Archivo de pago bancario del período cerrado (diseño 06). */
export function TarjetaPagoBanco({ periodoId, periodoEstado }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [archivo, setArchivo] = useState<ArchivoLegal | null>(null);
  const cerrado = periodoEstado === "cerrado" || periodoEstado === "pagado";
  const generar = async () => {
    const r = await ejecutar<ArchivoLegal>("nomina.pago_banco.generar", { periodoId });
    if (r) setArchivo(r);
  };
  const conErrores = archivo !== null && archivo.errores.length > 0;
  const listo = archivo !== null && !conErrores && archivo.filas > 0;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-subheading">Archivo de pago bancario</span>
          <Badge tono="neutro">Formato por verificar</Badge>
          {!cerrado ? <Badge tono="warning">Período abierto</Badge> : null}
        </div>
        <span className="t-body-sm text-fg-muted">CSV con el líquido y la cuenta por defecto de cada persona · solo con el período cerrado o pagado.</span>
        {archivo ? <span className="t-mono t-body-sm">{archivo.nombre}</span> : null}
      </div>
      {!cerrado ? (
        <Alerta tono="warning" titulo="Cierra el período antes de generar el archivo de pago." />
      ) : null}
      {archivo ? <ResultadoArchivo archivo={archivo} tipo="pago_banco" /> : null}
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente || !cerrado} onClick={() => void generar()}>
          <Download aria-hidden className="size-4" />
          Generar CSV
        </Button>
        <Button
          variant="primary"
          disabled={pendiente || !listo}
          onClick={() => {
            if (!archivo) return;
            descargar(archivo.nombre, archivo.contenido);
            avisar.exito(`Pago banco · ${archivo.filas} transferencias`);
          }}
        >
          Descargar
        </Button>
      </div>
    </Card>
  );
}