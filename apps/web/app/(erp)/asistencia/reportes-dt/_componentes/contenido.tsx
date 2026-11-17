"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alerta, Badge, Table, Td, Th, Tr, cn, estilosBoton } from "@opai/ds";

type Catalogo = { id: string; titulo: string; descripcion: string; obligatorio: boolean };
type Cabecera = {
  razonSocial: string;
  rutEmpleador: string;
  trabajador: string | null;
  rutTrabajador: string | null;
  lugar: string;
  periodo: string;
};
type Vista = {
  tipo: string;
  titulo: string;
  cabecera: Cabecera;
  columnas: { clave: string; etiqueta: string }[];
  filas: Record<string, string | number | boolean | null>[];
  siglasUsadas: string[];
  totalFilas: number;
  provisorio: boolean;
};

const GLosas: Record<string, string> = {
  "A.I.": "Ausencia injustificada",
  "A.J.": "Ausencia justificada",
  AT: "Accidente del trabajo",
  "C.T.": "Cambio de turno",
  "D.E.J.": "Distribución especial de la jornada",
  "H.E.": "Horas extraordinarias",
  "J.O.": "Jornada ordinaria",
  "L.M.": "Licencia médica",
  "P.G.R.": "Permiso con goce de remuneración",
  "PREN.": "Prenatal",
  "P.S.G.R.": "Permiso sin goce de remuneración",
  POSTN: "Postnatal",
  "S.A.": "Sin asistencia",
  VAC: "Vacaciones",
};

function urlExport(
  params: Record<string, string | undefined>,
  formato: "xlsx" | "pdf",
) {
  const q = new URLSearchParams({ ...params, formato } as Record<string, string>);
  return `/api/asistencia/reportes-dt/export?${q}`;
}

export function ContenidoReportesDt({
  catalogo,
  vista,
  params,
}: {
  catalogo: Catalogo[];
  vista: Vista | null;
  params: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const activo = params.tipo ?? "asistencia";
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:gap-6">
      <nav className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-2" aria-label="Reportes DT">
        <span className="t-caption px-2 py-1 text-muted">Reportes obligatorios</span>
        {catalogo
          .filter((c) => c.obligatorio)
          .map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(
                "flex min-h-11 w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left",
                activo === c.id ? "bg-fill" : "hover:bg-fill/60",
              )}
              onClick={() =>
                router.push(`/asistencia/reportes-dt?${new URLSearchParams({ ...params, tipo: c.id } as Record<string, string>)}`)
              }
            >
              <span className="t-body-sm font-medium">{c.titulo}</span>
              <span className="t-caption text-muted">{c.descripcion}</span>
            </button>
          ))}
        <span className="t-caption mt-2 border-t border-border px-2 py-1 text-muted">Otros</span>
        <Link href="/verificar/marca" className="t-body-sm px-2 py-2 text-accent hover:underline">
          Verificar marcación por hash
        </Link>
        <Link href="/asistencia/certificacion" className="t-body-sm px-2 py-2 text-accent hover:underline">
          Checklist de certificación
        </Link>
      </nav>
      <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        {vista ? (
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
            <div className="grid gap-3 rounded-md border border-border bg-bg p-4 md:grid-cols-2 lg:grid-cols-3">
              <Par etiqueta="Razón social" valor={vista.cabecera.razonSocial} />
              <Par etiqueta="RUT empleador" valor={vista.cabecera.rutEmpleador} mono />
              {vista.cabecera.trabajador ? <Par etiqueta="Trabajador" valor={vista.cabecera.trabajador} /> : null}
              {vista.cabecera.rutTrabajador ? <Par etiqueta="RUT trabajador" valor={vista.cabecera.rutTrabajador} mono /> : null}
              <Par etiqueta="Lugar" valor={vista.cabecera.lugar} className="md:col-span-2" />
            </div>
            {vista.filas.length ? (
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
            ) : (
              <p className="t-body-sm text-muted">No hay registros en este período.</p>
            )}
            {vista.siglasUsadas.length ? (
              <dl className="flex flex-wrap gap-x-4 gap-y-1">
                {vista.siglasUsadas.map((s) => (
                  <div key={s} className="flex gap-2 text-sm">
                    <dt className="font-mono font-medium">{s}</dt>
                    <dd className="text-muted">{GLosas[s] ?? s}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <Badge tono="neutro">{vista.totalFilas} filas</Badge>
          </>
        ) : (
          <p className="t-body-sm text-muted">Elige un reporte y período.</p>
        )}
      </section>
    </div>
  );
}

function Par({ etiqueta, valor, mono, className }: { etiqueta: string; valor: string; mono?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="t-caption text-muted">{etiqueta}</span>
      <span className={cn("t-body-sm", mono && "font-mono")}>{valor || "—"}</span>
    </div>
  );
}