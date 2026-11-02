"use client";

import { Alerta, Badge } from "@opai/ds";

import { pesos } from "@/lib/fechas";

const ESTADOS: Record<string, string> = {
  borrador: "Borrador",
  en_aprobacion: "En aprobación",
  lista: "Lista",
  enviada: "Enviada",
};

export function ResumenCotizacion({
  version,
  calculo,
  meta,
}: {
  version: { numero: number; estado: string; validaHasta: string | null };
  calculo: {
    ventaMensual?: number | null;
    categorias?: { id: string; costoMensual: number }[];
    semaforo?: string;
    margenEfectivoPct?: number;
    requiereAprobacion?: boolean;
    noEnviable?: boolean;
    advertencias?: string[];
  };
  meta?: {
    fechaCalculo?: string;
    validaHastaContrato?: string | null;
    avisoRecalculo?: { mensaje: string } | null;
  };
}) {
  const venta =
    calculo.ventaMensual == null ? "Borrador sin precio" : pesos(calculo.ventaMensual);
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <p className="t-label">Resumen</p>
      <p className="t-body-sm">Venta mensual: {venta}</p>
      {"margenEfectivoPct" in calculo ? (
        <p className="t-caption">
          Margen {((calculo.margenEfectivoPct ?? 0) / 10_000).toFixed(1)} %
        </p>
      ) : null}
      {calculo.semaforo ? (
        <Badge
          tono={
            calculo.semaforo === "verde" ? "success" : calculo.semaforo === "rojo" ? "danger" : "warning"
          }
        >
          {calculo.semaforo}
        </Badge>
      ) : null}
      {calculo.requiereAprobacion ? <Badge tono="warning">Requiere aprobación</Badge> : null}
      {calculo.noEnviable ? <Badge tono="warning">No enviable</Badge> : null}
      {meta?.avisoRecalculo ? (
        <Alerta tono="warning" titulo="Valores desactualizados">
          {meta.avisoRecalculo.mensaje}
        </Alerta>
      ) : null}
      {calculo.advertencias?.map((a) => (
        <p key={a} className="t-caption text-fg-muted">
          {a}
        </p>
      ))}
      <p className="t-caption">
        v{version.numero} · {ESTADOS[version.estado] ?? version.estado}
      </p>
      {meta?.fechaCalculo ? (
        <p className="t-caption text-fg-muted">
          Cálculo: {meta.fechaCalculo.split("-").reverse().join("-")}
        </p>
      ) : null}
      {(meta?.validaHastaContrato ?? version.validaHasta) ? (
        <p className="t-caption text-fg-muted">
          Válida hasta{" "}
          {(meta?.validaHastaContrato ?? version.validaHasta)?.split("-").reverse().join("-")}
        </p>
      ) : null}
      {calculo.categorias?.slice(0, 8).map((cat) => (
        <p key={cat.id} className="t-caption">
          {cat.id}: {pesos(cat.costoMensual)}
        </p>
      ))}
    </div>
  );
}
