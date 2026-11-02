"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { Alerta, PlanillaScreen, type EstadoPantalla } from "@opai/ds";

import { AccionesFlujoEscritorio, AccionesFlujoMovil } from "./acciones-flujo-toolbar";
import { celdaEditable, type Planilla } from "./datos";
import type { ArmadoPlanilla } from "./datos";

const HojaCelda = dynamic(() => import("./hoja-celda").then((m) => ({ default: m.HojaCelda })));
const HojaImportar = dynamic(() => import("./hoja-importar").then((m) => ({ default: m.HojaImportar })));
const HojaMover = dynamic(() => import("./hoja-mover").then((m) => ({ default: m.HojaMover })));

type Props = {
  state: EstadoPantalla;
  planilla: Planilla;
  armado: ArmadoPlanilla;
  gestiona: boolean;
  configura: boolean;
  avisoTitulo: string | null;
  textosError: Record<string, unknown> | undefined;
  seleccion: { filaId: string; semana: string } | null;
  onSeleccion: (s: { filaId: string; semana: string } | null) => void;
  importAbierta: boolean;
  onImportAbiertaChange: (v: boolean) => void;
};

export function PlanillaFlujoEscritorio({
  state,
  planilla: p,
  armado,
  gestiona,
  configura,
  avisoTitulo,
  textosError,
  seleccion,
  onSeleccion,
  importAbierta,
  onImportAbiertaChange,
}: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {avisoTitulo ? (
        <Alerta tono="danger" titulo={avisoTitulo}>
          Revisa la semana en la planilla. Aviso in-app sin envío externo (CAR-136).
        </Alerta>
      ) : null}
      <PlanillaScreen
        state={state}
        titulo="Flujo de caja"
        subtitulo={`Próximas ${p.semanas.length} semanas · montos en CLP`}
        accionesSiempre
        cabeceraSoloTelefono
        acciones={
          <>
            <AccionesFlujoEscritorio configura={configura} onImportar={() => onImportAbiertaChange(true)} />
            <AccionesFlujoMovil configura={configura} onImportar={() => onImportAbiertaChange(true)} />
          </>
        }
        textos={{
          ...(textosError ?? {}),
          vacio: {
            titulo: "Sin filas en el flujo",
            descripcion: "Agrega filas en Configuración › Módulos › Finanzas › Flujo de caja.",
          },
        }}
        filas={armado.filas.length > 3 ? armado.filas : []}
        columnas={armado.columnas}
        celda={armado.celda}
        celdaEditable={armado.celdaEditable}
        {...(gestiona
          ? {
              onCelda: (filaId: string, semana: string) => {
                if (celdaEditable(p, filaId, semana)) onSeleccion({ filaId, semana });
              },
            }
          : {})}
      />
      {gestiona ? (
        <p className="text-sm text-fg-muted">
          Toca una celda planificada para editarla. Las semanas pasadas muestran lo real según cartola.{" "}
          <Link href="/configuracion/modulo/finanzas?seccion=flujo-caja" className="text-accent underline">
            Filas y ajustes
          </Link>
        </p>
      ) : null}
      {gestiona ? (
        <>
          <HojaCelda
            abierta={!!seleccion}
            onCerrar={() => onSeleccion(null)}
            contexto={seleccion ? celdaEditable(p, seleccion.filaId, seleccion.semana) : null}
          />
          <HojaMover
            filas={p.filas}
            semanas={p.semanas.map((s) => s.semana)}
            semanasPasadas={p.semanas.filter((s) => s.pasada).map((s) => s.semana)}
            horizonte={p.semanas.length}
          />
        </>
      ) : null}
      {configura ? (
        <HojaImportar abierta={importAbierta} onAbiertaChange={onImportAbiertaChange} ocultarDisparador />
      ) : null}
    </div>
  );
}
