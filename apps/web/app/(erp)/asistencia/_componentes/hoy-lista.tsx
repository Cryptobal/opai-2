"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button, cn, type EstadoPantalla, GRILLA_KPI_HILO, KpiTile, ListScreen } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { diaLargo } from "@/lib/fechas";

import { columnasHoy, tarjetaHoy } from "./hoy-columnas";
import { ProponerCorreccion } from "./proponer-correccion";

export type ItemHoy = {
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

type Props = {
  state: EstadoPantalla;
  fecha: string;
  zona: string;
  resumen: { turnos: number; presentes: number; sinMarca: number; ausentes: number; incompletos: number; atrasos: number };
  items: ItemHoy[];
  opcionesFiltro: { valor: string; etiqueta: string }[];
};

function Kpis({ r, className }: { r: Props["resumen"]; className: string }) {
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

export function HoyLista({ state, fecha, zona, resumen, items, opcionesFiltro }: Props) {
  const router = useRouter();
  const [corregir, setCorregir] = useState<ItemHoy | null>(null);
  const hora = useMemo(() => new Intl.DateTimeFormat("es-CL", { timeStyle: "short", hourCycle: "h23", timeZone: zona }), [zona]);
  const h = (v: string | null) => (v ? hora.format(new Date(v)) : "—");
  const desde = `${fecha}T00:00:00.000Z`;
  const hasta = `${fecha}T23:59:59.999Z`;

  return (
    <>
      <Kpis r={resumen} className={cn("hidden grid-cols-5 gap-3 md:grid", GRILLA_KPI_HILO)} />
      <ListScreen<ItemHoy>
        state={state}
        titulo="Asistencia de hoy"
        subtitulo={`${diaLargo(new Date(`${fecha}T12:00:00Z`), zona)} · ${resumen.turnos} turnos`}
        filtros={
          <div className="flex w-full flex-col gap-3">
            <Kpis r={resumen} className={cn("grid grid-cols-2 gap-3 md:hidden", GRILLA_KPI_HILO)} />
            <ChipsFiltro filtros={[{ param: "estado", etiqueta: "Estado", opciones: opcionesFiltro }]} />
          </div>
        }
        items={items}
        clave={(x) => x.personaId}
        acciones={(x) =>
          x.entrada || x.salida ? (
            <Button variant="secondary" onClick={() => setCorregir(x)}>
              Proponer corrección
            </Button>
          ) : null
        }
        tarjeta={tarjetaHoy(h)}
        columnas={columnasHoy(h)}
        textos={{
          vacio: { titulo: "Sin turnos hoy", descripcion: "Cuando haya turnos esperados para hoy, aparecerán aquí con su asistencia." },
        }}
      />
      {corregir ? (
        <ProponerCorreccion
          abierto
          onCerrar={() => setCorregir(null)}
          onListo={() => router.refresh()}
          personaId={corregir.personaId}
          personaNombre={corregir.nombre}
          desde={desde}
          hasta={hasta}
        />
      ) : null}
    </>
  );
}