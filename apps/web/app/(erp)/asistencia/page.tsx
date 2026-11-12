import { Badge, cn, GRILLA_KPI_HILO, KpiTile, ListScreen } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

export const metadata = { title: "Asistencia de hoy" };
type Props = { searchParams: SearchParams };

type Item = {
  personaId: string; nombre: string; instalacion: string | null; turnoInicio: string | null; turnoFin: string | null;
  entrada: string | null; salida: string | null; estado: string; atrasoMin: number; tipoJornada: string;
  correccionPendiente: boolean; descansoInsuficiente: boolean; marcaFueraDeTurno: boolean;
};
type Datos = {
  fecha: string; zona: string; truncado: boolean;
  resumen: { turnos: number; presentes: number; sinMarca: number; ausentes: number; incompletos: number; atrasos: number };
  items: Item[];
};

const ESTADOS: Record<string, { etiqueta: string; tono: "success" | "warning" | "danger" | "info" | "neutro" }> = {
  presente: { etiqueta: "Presente", tono: "success" },
  sin_marca: { etiqueta: "Sin marca", tono: "warning" },
  ausente: { etiqueta: "Ausente", tono: "danger" },
  incompleto: { etiqueta: "Sin salida", tono: "info" },
  sin_turno: { etiqueta: "Sin turno", tono: "neutro" },
};
const OPCIONES = Object.entries(ESTADOS).filter(([k]) => k !== "sin_turno").map(([valor, e]) => ({ valor, etiqueta: e.etiqueta }));
function Kpis({ r, className }: { r: Datos["resumen"]; className: string }) {
  return (
    <div className={className}>
      <KpiTile etiqueta="Turnos de hoy" valor={String(r.turnos)} />
      <KpiTile etiqueta="Presentes" valor={String(r.presentes)} />
      <KpiTile etiqueta="Sin marca" valor={String(r.sinMarca)} />
      <KpiTile etiqueta="Ausentes" valor={String(r.ausentes)} />
      <KpiTile etiqueta="Atrasos" valor={String(r.atrasos)} />
    </div>
  );
}

/** «jueves 5 nov 2026» en la zona de la empresa. */
function fechaLarga(iso: string, zona: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: zona })
      .formatToParts(new Date(`${iso}T12:00:00Z`))
      .map((x) => [x.type, x.value]),
  );
  return `${p["weekday"]} ${p["day"]} ${String(p["month"]).replace(".", "")} ${p["year"]}`;
}

/** 600 → «10 h»; 150 → «2 h 30 min»; 45 → «45 min». */
function duracion(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const formatoHora = (zona: string) => new Intl.DateTimeFormat("es-CL", { timeStyle: "short", hourCycle: "h23", timeZone: zona });

/** «Asistencia de hoy» (A3): presentes, sin marca, atrasos y correcciones pendientes de los turnos del día. */
export default function AsistenciaHoy({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Asistencia de hoy"
      ruta="/asistencia"
      completo
      cargar={async () => {
        const p = await leerParametros(searchParams);
        return ejecutarComoUsuario<Datos>("erp", "asistencia.dias.hoy", p["estado"] ? { estado: p["estado"] } : {});
      }}
    >
      {(r) => {
        const d = r.ok ? r.data : null;
        const hora = formatoHora(d?.zona ?? "America/Santiago");
        const h = (v: string | null) => (v ? hora.format(new Date(v)) : "—");
        return (
          <div className="flex flex-col gap-4">
            {d ? <Kpis r={d.resumen} className={cn("hidden grid-cols-5 gap-3 md:grid", GRILLA_KPI_HILO)} /> : null}
            <ListScreen<Item>
              state={estadoPantalla(r)}
              titulo="Asistencia de hoy"
              subtitulo={d ? `${fechaLarga(d.fecha, d.zona)} · ${d.resumen.turnos} turnos` : undefined}
              filtros={
                <div className="flex w-full flex-col gap-3">
                  {d ? <Kpis r={d.resumen} className={cn("grid grid-cols-2 gap-3 md:hidden", GRILLA_KPI_HILO)} /> : null}
                  <ChipsFiltro filtros={[{ param: "estado", etiqueta: "Estado", opciones: OPCIONES }]} />
                </div>
              }
              items={d?.items ?? []}
              clave={(x) => x.personaId}
              tarjeta={(x) => (
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-base font-medium text-fg">{x.nombre}</span>
                    <Badge tono={ESTADOS[x.estado]?.tono ?? "neutro"}>{ESTADOS[x.estado]?.etiqueta ?? x.estado}</Badge>
                  </span>
                  <span className="t-caption">
                    {x.instalacion ?? "Sin instalación"} · Turno {h(x.turnoInicio)}–{h(x.turnoFin)} · Entrada {h(x.entrada)}
                    {x.atrasoMin > 0 ? ` · Atraso ${duracion(x.atrasoMin)}` : ""}
                    {x.correccionPendiente ? " · Corrección pendiente" : ""}
                    {x.marcaFueraDeTurno ? " · Marca fuera de turno" : ""}
                  </span>
                </span>
              )}
              columnas={[
                { id: "persona", etiqueta: "Persona", render: (x) => x.nombre },
                { id: "instalacion", etiqueta: "Instalación", render: (x) => x.instalacion ?? "—" },
                { id: "turno", etiqueta: "Turno", render: (x) => `${h(x.turnoInicio)}–${h(x.turnoFin)}` },
                { id: "entrada", etiqueta: "Entrada", render: (x) => h(x.entrada) },
                { id: "salida", etiqueta: "Salida", render: (x) => h(x.salida) },
                { id: "atraso", etiqueta: "Atraso", render: (x) => (x.atrasoMin > 0 ? duracion(x.atrasoMin) : "—") },
                {
                  id: "estado", etiqueta: "Estado",
                  render: (x) => (
                    <span className="flex flex-wrap items-center gap-1">
                      <Badge tono={ESTADOS[x.estado]?.tono ?? "neutro"}>{ESTADOS[x.estado]?.etiqueta ?? x.estado}</Badge>
                      {x.correccionPendiente ? <Badge tono="info">Corrección pendiente</Badge> : null}
                      {x.descansoInsuficiente ? <Badge tono="warning">Descanso insuficiente</Badge> : null}
                      {x.marcaFueraDeTurno ? <Badge tono="warning">Marca fuera de turno</Badge> : null}
                    </span>
                  ),
                },
              ]}
              textos={{
                vacio: { titulo: "Sin turnos hoy", descripcion: "Cuando haya turnos esperados para hoy, aparecerán aquí con su asistencia." },
              }}
            />
          </div>
        );
      }}
    </PaginaPortal>
  );
}
