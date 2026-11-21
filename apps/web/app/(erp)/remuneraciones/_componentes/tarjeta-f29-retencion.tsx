"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Card } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { ObligacionArchivo } from "./comprobante-obligacion";

type Archivo = {
  nombre: string;
  mime: string;
  base64: string;
  filas: number;
  errores: { mensaje: string }[];
  advertencias: string[];
};

const MARCABLE = new Set(["por_generar", "generado", "con_errores"]);

function descargarBinario(nombre: string, mime: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

type Props = { periodoId: string; obligacion: ObligacionArchivo | null };

/** Excel de retenciones F29 del período (diseño 06). */
export function TarjetaF29Retencion({ periodoId, obligacion }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const router = useRouter();
  const [archivo, setArchivo] = useState<Archivo | null>(null);
  const generar = async () => {
    const r = await ejecutar<Archivo>("nomina.f29.generar", { periodoId });
    if (!r) return;
    setArchivo(r);
    const estado = r.errores.length > 0 ? "con_errores" : "generado";
    if (obligacion && MARCABLE.has(obligacion.estado) && obligacion.estado !== estado) {
      await ejecutar("nomina.obligaciones.actualizar", { id: obligacion.id, estado });
      router.refresh();
    }
  };
  const conErrores = archivo !== null && archivo.errores.length > 0;
  const listo = archivo !== null && !conErrores && archivo.filas > 0;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-subheading">Retención impuesto único (F29)</span>
          <Badge tono="neutro">Formato por verificar</Badge>
        </div>
        <span className="t-body-sm text-fg-muted">Excel con el impuesto único retenido por persona según las liquidaciones del período.</span>
        {archivo ? <span className="t-mono t-body-sm">{archivo.nombre}</span> : null}
      </div>
      {archivo?.errores.length ? (
        <Alerta tono="danger" titulo={`${archivo.errores.length} observaciones · revisa antes de declarar`} />
      ) : null}
      {archivo?.advertencias[0] ? <Alerta tono="info" titulo={archivo.advertencias[0]} /> : null}
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente} onClick={() => void generar()}>
          <Download aria-hidden className="size-4" />
          Generar Excel
        </Button>
        <Button
          variant="primary"
          disabled={pendiente || !listo}
          onClick={() => {
            if (!archivo) return;
            descargarBinario(archivo.nombre, archivo.mime, archivo.base64);
            avisar.exito(`Excel F29 · ${archivo.filas} personas`);
          }}
        >
          Descargar
        </Button>
      </div>
    </Card>
  );
}