import { SIGLAS } from "@opai/mod-asistencia/domain/siglas";
import { Alerta, Badge, Table, Td, Th, Tr, cn, estilosBoton } from "@opai/ds";
import type { VistaReporteDt } from "./tipos";

function urlExport(params: Record<string, string | undefined>, formato: "xlsx" | "pdf") {
  const q = new URLSearchParams({ ...params, formato } as Record<string, string>);
  return `/api/asistencia/reportes-dt/export?${q}`;
}

function Par({ etiqueta, valor, mono, className }: { etiqueta: string; valor: string; mono?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="t-caption text-muted">{etiqueta}</span>
      <span className={cn("t-body-sm", mono && "font-mono")}>{valor || "—"}</span>
    </div>
  );
}

function EncabezadoReporteDt({
  vista,
  params,
}: {
  vista: VistaReporteDt;
  params: Record<string, string | undefined>;
}) {
  return (
  <>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="t-subheading m-0">{vista.titulo}</h2>
        <p className="t-body-sm m-0 text-muted">
          Vista previa · {vista.cabecera.periodo}
          {vista.provisorio ? " · incluye correcciones pendientes" : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a className={estilosBoton({ variant: "secondary" })} href={urlExport(params, "xlsx")}>
          Excel
        </a>
        <a className={estilosBoton({ variant: "secondary" })} href={urlExport(params, "pdf")}>
          PDF
        </a>
      </div>
    </div>
    {vista.provisorio ? (
      <Alerta tono="warning" titulo="Datos provisorios">
        Hay correcciones pendientes: los totales usan el valor original hasta que el trabajador responda.
      </Alerta>
    ) : null}
  </>
  );
}

function TablaVistaReporte({ vista }: { vista: VistaReporteDt }) {
  if (!vista.filas.length) {
    return <p className="t-body-sm text-muted">No hay registros en este período.</p>;
  }
  return (
    <Table etiqueta={vista.titulo}>
      <thead>
        <Tr>
          {vista.columnas.map((c) => (
            <Th key={c.clave}>{c.etiqueta}</Th>
          ))}
        </Tr>
      </thead>
      <tbody>
        {vista.filas.map((fila, i) => (
          <Tr key={i}>
            {vista.columnas.map((c) => (
              <Td key={c.clave}>{String(fila[c.clave] ?? "—")}</Td>
            ))}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

export function VistaReporteDtPanel({
  vista,
  params,
}: {
  vista: VistaReporteDt | null;
  params: Record<string, string | undefined>;
}) {
  if (!vista) {
    return <p className="t-body-sm text-muted">Elige un reporte y período.</p>;
  }
  return (
    <>
      <EncabezadoReporteDt vista={vista} params={params} />
      <div className="grid gap-3 rounded-md border border-border bg-bg p-4 md:grid-cols-2 lg:grid-cols-3">
        <Par etiqueta="Razón social" valor={vista.cabecera.razonSocial} />
        <Par etiqueta="RUT empleador" valor={vista.cabecera.rutEmpleador} mono />
        {vista.cabecera.trabajador ? <Par etiqueta="Trabajador" valor={vista.cabecera.trabajador} /> : null}
        {vista.cabecera.rutTrabajador ? <Par etiqueta="RUT trabajador" valor={vista.cabecera.rutTrabajador} mono /> : null}
        <Par etiqueta="Lugar" valor={vista.cabecera.lugar} className="md:col-span-2" />
      </div>
      <TablaVistaReporte vista={vista} />
      {vista.siglasUsadas.length ? (
        <dl className="flex flex-wrap gap-x-4 gap-y-1">
          {vista.siglasUsadas.map((s) => (
            <div key={s} className="flex gap-2 text-sm">
              <dt className="font-mono font-medium">{s}</dt>
              <dd className="text-muted">{SIGLAS[s as keyof typeof SIGLAS] ?? s}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <Badge tono="neutro">{vista.totalFilas} filas</Badge>
    </>
  );
}