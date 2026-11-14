"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { Alerta, Badge, PlanillaScreen, type EstadoPantalla } from "@opai/ds";

import { AccionesFlujoEscritorio, AccionesFlujoMovil } from "./acciones-flujo-toolbar";
import { AvisoSaldoBanco, AvisosProyeccion } from "./aviso-saldo-banco";
import { celdaEditable, filaBase, type Planilla } from "./datos";
import type { ArmadoPlanilla } from "./datos";
import { hojaEspecial, type HojaEspecial } from "./cobros-celda";

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
  /** Abre la hoja de «Cobros esperados» (CAR-396) o del IVA (CAR-397) de la semana. */
  onHoja: (h: HojaEspecial) => void;
  importAbierta: boolean;
  onImportAbiertaChange: (v: boolean) => void;
  /** Abre o cierra el detalle por cliente e instalación de los cobros (CAR-456). */
  onAlternarFila: (filaId: string) => void;
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
  onHoja,
  importAbierta,
  onImportAbiertaChange,
  onAlternarFila,
}: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {avisoTitulo ? (
        <Alerta tono="danger" titulo={avisoTitulo}>
          Revisa la semana en la planilla. El aviso se muestra solo dentro de OPAI, sin enviar correos.
        </Alerta>
      ) : null}
      <AvisoSaldoBanco saldoBanco={p.saldoBanco} />
      <AvisosProyeccion avisos={p.avisos} />
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
        onAlternarFila={onAlternarFila}
        {...(gestiona
          ? {
              onCelda: (filaId: string, semana: string) => {
                if (celdaEditable(p, filaId, semana)) onSeleccion({ filaId, semana });
                else {
                  const h = hojaEspecial(p, filaBase(filaId), semana);
                  if (h) onHoja(h);
                }
              },
            }
          : {})}
      />
      {gestiona ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-fg-muted">
          <span className="flex flex-wrap items-center gap-2" aria-label="Qué significa cada color">
            <Badge tono="success">Real del banco</Badge>
            <Badge tono="info">Comprometido</Badge>
            <Badge tono="neutro">Planificado</Badge>
          </span>
          <span>
            Toca una celda planificada para editarla; las semanas pasadas muestran lo real de la cartola.{" "}
            <Link href="/configuracion/modulo/finanzas?seccion=flujo-caja" className="text-accent underline">
              Filas y ajustes
            </Link>
          </span>
        </div>
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
