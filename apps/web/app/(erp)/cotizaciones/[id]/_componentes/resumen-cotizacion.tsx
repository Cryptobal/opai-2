import { Badge } from "@opai/ds";

import { pesos } from "@/lib/fechas";

const ESTADOS: Record<string, string> = { borrador: "Borrador", enviada: "Enviada", lista: "Lista" };

export function ResumenCotizacion({
  version,
  calculo,
}: {
  version: { numero: number; estado: string; validaHasta: string | null };
  calculo: {
    ventaMensual?: number | null;
    categorias?: { id: string; costoMensual: number }[];
    semaforo?: string;
    margenEfectivoPct?: number;
    noEnviable?: boolean;
    advertencias?: string[];
  };
}) {
  const venta =
    calculo.ventaMensual == null ? "Costo pendiente" : pesos(calculo.ventaMensual);
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <p className="t-label">Resumen</p>
      <p className="t-body-sm">Venta mensual: {venta}</p>
      {"margenEfectivoPct" in calculo ? (
        <p className="t-caption">Margen {((calculo.margenEfectivoPct ?? 0) / 10_000).toFixed(1)} %</p>
      ) : null}
      {"semaforo" in calculo ? (
        <Badge tono={calculo.semaforo === "verde" ? "success" : "warning"}>{calculo.semaforo}</Badge>
      ) : null}
      {calculo.noEnviable ? <Badge tono="warning">No enviable</Badge> : null}
      {calculo.advertencias?.map((a) => (
        <p key={a} className="t-caption text-fg-muted">
          {a}
        </p>
      ))}
      <p className="t-caption">
        v{version.numero} · {ESTADOS[version.estado] ?? version.estado} · Vence{" "}
        {version.validaHasta?.split("-").reverse().join("-") ?? "—"}
      </p>
      {calculo.categorias?.slice(0, 8).map((cat) => (
        <p key={cat.id} className="t-caption">
          {cat.id}: {pesos(cat.costoMensual)}
        </p>
      ))}
    </div>
  );
}
