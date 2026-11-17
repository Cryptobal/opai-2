"use client";

import { NavReportesDt } from "./nav-reportes-dt";
import type { CatalogoReporte, VistaReporteDt } from "./tipos";
import { VistaReporteDtPanel } from "./vista-reporte-dt";

export function ContenidoReportesDt({
  catalogo,
  vista,
  params,
}: {
  catalogo: CatalogoReporte[];
  vista: VistaReporteDt | null;
  params: Record<string, string | undefined>;
}) {
  const activo = params.tipo ?? "asistencia";
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:gap-6">
      <NavReportesDt catalogo={catalogo} activo={activo} params={params} />
      <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <VistaReporteDtPanel vista={vista} params={params} />
      </section>
    </div>
  );
}