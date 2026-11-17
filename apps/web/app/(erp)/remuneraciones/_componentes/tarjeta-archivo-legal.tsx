"use client";

import { Download, FileCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Card } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { ComprobanteObligacion, type ObligacionArchivo } from "./comprobante-obligacion";
import { descargarTexto } from "./descargar";
import { type ArchivoLegal, ResultadoArchivo } from "./resultado-archivo";

type Archivo = ArchivoLegal;

const TEXTOS = {
  lre: { titulo: "Libro de Remuneraciones Electrónico (LRE)", desc: "Carga mensual en Mi DT · separador «;» y encabezados del suplemento", tipo: "text/csv" },
  previred: { titulo: "Previred · cotizaciones", desc: "AFP, SIS, salud, seguro de cesantía y mutual por persona · 105 campos", tipo: "text/plain" },
  f30_1: { titulo: "Certificado F30-1", desc: "Cumplimiento laboral y previsional del mes · texto por verificar", tipo: "text/plain" },
} as const;

/** Un archivo legal del período (diseño 06): validar, ver los errores y descargar cuando no hay errores. */
const CERRADA: Record<string, string> = { cargado: "Cargado con comprobante", pagado: "Pagado con comprobante" };
/** Desde dónde el generador puede marcar el resultado de la validación (transiciones de `obligaciones.ts`). */
const MARCABLE = new Set(["por_generar", "generado", "con_errores"]);

type Props = { periodoId: string; tipo: "lre" | "previred" | "f30_1"; obligacion: ObligacionArchivo | null; tenantId: string };

const CAP_GENERAR = {
  lre: "nomina.lre.generar",
  previred: "nomina.previred.generar",
  f30_1: "nomina.f30_1.generar",
} as const;

export function TarjetaArchivoLegal({ periodoId, tipo, obligacion, tenantId }: Props) {
  const t = TEXTOS[tipo];
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const router = useRouter();
  const [archivo, setArchivo] = useState<Archivo | null>(null);
  async function validar() {
    const r = await ejecutar<Archivo>(CAP_GENERAR[tipo], { periodoId });
    if (!r) return;
    setArchivo(r);
    // Deja el resultado en el calendario de obligaciones (generado o con errores), si el mes no está cerrado.
    const estado = r.errores.length > 0 ? "con_errores" : "generado";
    if (obligacion && MARCABLE.has(obligacion.estado) && obligacion.estado !== estado) {
      await ejecutar("nomina.obligaciones.actualizar", { id: obligacion.id, estado });
      router.refresh();
    }
  }
  const conErrores = archivo !== null && archivo.errores.length > 0;
  const listo = archivo !== null && !conErrores && archivo.filas > 0;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-subheading">{t.titulo}</span>
          <EstadoArchivo cerrada={obligacion ? (CERRADA[obligacion.estado] ?? null) : null} validado={archivo !== null} conErrores={conErrores} />
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
            descargarTexto(archivo.nombre, archivo.contenido, t.tipo);
            avisar.exito(`Archivo descargado: ${archivo.filas} personas`);
          }}
        >
          <Download aria-hidden className="size-4" />
          Descargar
        </Button>
      </div>
      {obligacion && tenantId && (tipo === "lre" || tipo === "previred") && admiteComprobante(obligacion) ? (
        <ComprobanteObligacion obligacion={obligacion} tenantId={tenantId} tipo={tipo} />
      ) : null}
    </Card>
  );
}

/** Se sube con el archivo generado o cargado; una obligación pagada con comprobante queda fija. */
const admiteComprobante = (o: ObligacionArchivo) =>
  ["generado", "cargado"].includes(o.estado) || (o.estado === "pagado" && !o.comprobanteDocumentoId);

/** Estado de la tarjeta: cerrada con comprobante, resultado de la validación o sin validar. */
function EstadoArchivo({ cerrada, validado, conErrores }: { cerrada: string | null; validado: boolean; conErrores: boolean }) {
  if (cerrada) return <Badge tono="success" punto>{cerrada}</Badge>;
  if (!validado) return <Badge tono="neutro" punto>Sin validar</Badge>;
  return <Badge tono={conErrores ? "danger" : "success"} punto>{conErrores ? "Con errores" : "Validado"}</Badge>;
}
