import { Badge, cn, GRILLA_KPI_HILO, KpiTile, ListScreen } from "@opai/ds";
import type { Resultado } from "@opai/capabilities";
import { formatearHora } from "@opai/domain";

import { Buscador } from "@/app/_components/maestros/buscador";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { diaLargo } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";

export type DatosAsistenciaHoy = {
  fecha: string;
  zona: string;
  siguiente: string | null;
  resumen: { turnos: number; presentes: number; sinMarca: number; ausentes: number; incompletos: number; atrasos: number };
  items: Item[];
};

type Item = {
  personaId: string;
  nombre: string;
  instalacion: string | null;
  turnoInicio: string | null;
  turnoFin: string | null;
  entrada: string | null;
  salida: string | null;
  estado: string;
  atrasoMin: number;
  correccionPendiente: boolean;
  descansoInsuficiente: boolean;
  marcaFueraDeTurno: boolean;
};

const ESTADOS: Record<string, { etiqueta: string; tono: "success" | "warning" | "danger" | "info" | "neutro" }> = {
  presente: { etiqueta: "Presente", tono: "success" },
  sin_marca: { etiqueta: "Sin marca", tono: "warning" },
  ausente: { etiqueta: "Ausente", tono: "danger" },
  incompleto: { etiqueta: "Sin salida", tono: "info" },
  sin_turno: { etiqueta: "Sin turno", tono: "neutro" },
};

const OPCIONES = Object.entries(ESTADOS).filter(([k]) => k !== "sin_turno").map(([valor, e]) => ({ valor, etiqueta: e.etiqueta }));

const duracion = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

function Kpis({ r, className }: { r: DatosAsistenciaHoy["resumen"]; className: string }) {
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

function hrefMas(p: Record<string, string | null | undefined>, cursor: string) {
  const q = new URLSearchParams({ cursor });
  if (p.estado) q.set("estado", p.estado);
  if (p.q) q.set("q", p.q);
  return `/asistencia?${q}`;
}

function hora(v: string | null, zona: string) {
  return v ? formatearHora(v, zona) : "—";
}

function TarjetaAsistencia({ x, zona }: { x: Item; zona: string }) {
  const h = (v: string | null) => hora(v, zona);
  return (
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
  );
}

function columnasAsistencia(zona: string) {
  const h = (v: string | null) => hora(v, zona);
  return [
    { id: "persona", etiqueta: "Persona", render: (x: Item) => x.nombre },
    { id: "instalacion", etiqueta: "Instalación", render: (x: Item) => x.instalacion ?? "—" },
    { id: "turno", etiqueta: "Turno", render: (x: Item) => `${h(x.turnoInicio)}–${h(x.turnoFin)}` },
    { id: "entrada", etiqueta: "Entrada", render: (x: Item) => h(x.entrada) },
    { id: "salida", etiqueta: "Salida", render: (x: Item) => h(x.salida) },
    { id: "atraso", etiqueta: "Atraso", render: (x: Item) => (x.atrasoMin > 0 ? duracion(x.atrasoMin) : "—") },
    {
      id: "estado",
      etiqueta: "Estado",
      render: (x: Item) => (
        <span className="flex flex-wrap items-center gap-1">
          <Badge tono={ESTADOS[x.estado]?.tono ?? "neutro"}>{ESTADOS[x.estado]?.etiqueta ?? x.estado}</Badge>
          {x.correccionPendiente ? <Badge tono="info">Corrección pendiente</Badge> : null}
          {x.descansoInsuficiente ? <Badge tono="warning">Descanso insuficiente</Badge> : null}
          {x.marcaFueraDeTurno ? <Badge tono="warning">Marca fuera de turno</Badge> : null}
        </span>
      ),
    },
  ];
}

export function ListaAsistenciaHoyErp({
  resultado,
  parametros,
}: {
  resultado: Resultado<DatosAsistenciaHoy>;
  parametros: Record<string, string | null | undefined>;
}) {
  const d = resultado.ok ? resultado.data : null;
  const zona = d?.zona ?? "America/Santiago";

  return (
    <div className="flex flex-col gap-4">
      {d ? <Kpis r={d.resumen} className={cn("hidden grid-cols-5 gap-3 md:grid", GRILLA_KPI_HILO)} /> : null}
      <ListScreen<Item>
        state={estadoPantalla(resultado)}
        titulo="Asistencia de hoy"
        subtitulo={d ? `${diaLargo(new Date(`${d.fecha}T12:00:00Z`), d.zona)} · ${d.resumen.turnos} turnos` : undefined}
        filtros={
          <div className="flex w-full flex-col gap-3">
            {d ? <Kpis r={d.resumen} className={cn("grid grid-cols-2 gap-3 md:hidden", GRILLA_KPI_HILO)} /> : null}
            <Buscador placeholder="Buscar por persona o instalación…" />
            <ChipsFiltro filtros={[{ param: "estado", etiqueta: "Estado", opciones: OPCIONES }]} />
          </div>
        }
        items={d?.items ?? []}
        clave={(x) => x.personaId}
        tarjeta={(x) => <TarjetaAsistencia x={x} zona={zona} />}
        columnas={columnasAsistencia(zona)}
        textos={{ vacio: { titulo: "Sin turnos hoy", descripcion: "Cuando haya turnos esperados para hoy, aparecerán aquí con su asistencia." } }}
      />
      {d?.siguiente ? (
        <div className="flex justify-center">
          <EnlaceBoton href={hrefMas(parametros, d.siguiente)} variante="secondary">
            Cargar más
          </EnlaceBoton>
        </div>
      ) : null}
    </div>
  );
}