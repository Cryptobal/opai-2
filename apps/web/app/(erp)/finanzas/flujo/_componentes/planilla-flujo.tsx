"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Alerta, PlanillaScreen, type EstadoPantalla } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import {
  armarPlanilla,
  celdaEditable,
  clp,
  type Planilla,
} from "./datos";
import { HojaCelda } from "./hoja-celda";
import { HojaCierre } from "./hoja-cierre";
import { HojaImportar } from "./hoja-importar";
import { HojaMover } from "./hoja-mover";
import { VistaMovilFlujo } from "./vista-movil";

type Props = {
  state: EstadoPantalla;
  planilla: Planilla | null;
  gestiona: boolean;
  cierra: boolean;
  configura: boolean;
  movil: boolean;
};

export function PlanillaFlujo({ state, planilla, gestiona, cierra, configura, movil }: Props) {
  const [seleccion, setSeleccion] = useState<{ filaId: string; semana: string } | null>(null);
  const p = planilla;
  const armado = useMemo(() => (p ? armarPlanilla(p) : null), [p]);

  const avisoTitulo =
    p && p.aviso.semanas.length
      ? `Semana ${p.aviso.semanas[0]?.semana.slice(8, 10)}-${p.aviso.semanas[0]?.semana.slice(5, 7)} con saldo ${clp(p.aviso.semanas[0]?.saldoFinal ?? 0)}`
      : null;

  if (movil && p && armado) {
    return (
      <>
        {avisoTitulo ? (
          <Alerta tono="danger" titulo={avisoTitulo}>
            Aviso in-app configurado en el módulo. No se envía correo en este PR.
          </Alerta>
        ) : null}
        <VistaMovilFlujo planilla={p} gestiona={gestiona} onCelda={(filaId, semana) => setSeleccion({ filaId, semana })} />
        {gestiona ? (
          <HojaCelda
            abierta={!!seleccion}
            onCerrar={() => setSeleccion(null)}
            contexto={seleccion && p ? celdaEditable(p, seleccion.filaId, seleccion.semana) : null}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {avisoTitulo ? (
        <Alerta tono="danger" titulo={avisoTitulo}>
          Revisa la semana en la planilla. Aviso in-app sin envío externo (CAR-136).
        </Alerta>
      ) : null}
      {p?.ajustes.metasVisibles ? (
        <div className="grid gap-2 rounded-lg border border-border bg-surface p-3 text-sm md:grid-cols-3">
          <Meta titulo="Celda" meta={`${p.ajustes.metaCeldaMs} ms`} real="—" />
          <Meta titulo="Guardado p95" meta={`${p.ajustes.metaGuardadoP95Ms} ms`} real="—" />
          <Meta titulo="Carga inicial" meta={`${p.ajustes.metaCargaInicialS} s`} real="—" />
        </div>
      ) : null}
      <PlanillaScreen
        state={state}
        titulo="Flujo de caja"
        subtitulo={
          p
            ? `Próximas ${p.semanas.length} semanas · montos en CLP`
            : "Próximas 12 semanas · montos en CLP"
        }
        acciones={
          <div className="flex flex-wrap gap-2">
            <EnlaceBoton href="/finanzas/flujo?vista=movil" variante="secondary">
              Vista celular
            </EnlaceBoton>
            {configura ? (
              <EnlaceBoton href="/configuracion/modulo/finanzas?seccion=flujo-caja" variante="secondary">
                Configurar
              </EnlaceBoton>
            ) : null}
            {configura ? <HojaImportar /> : null}
          </div>
        }
        filas={armado && armado.filas.length > 3 ? armado.filas : []}
        columnas={armado?.columnas ?? []}
        celda={armado?.celda ?? (() => null)}
        {...(gestiona && p
          ? {
              onCelda: (filaId: string, semana: string) => {
                if (celdaEditable(p, filaId, semana)) setSeleccion({ filaId, semana });
              },
            }
          : {})}
        textos={{
          vacio: {
            titulo: "Sin filas en el flujo",
            descripcion: "Agrega filas en Configuración › Módulos › Finanzas › Flujo de caja.",
          },
        }}
      />
      {gestiona && p && armado ? (
        <p className="text-sm text-fg-muted">
          Toca una celda planificada para editarla.{" "}
          <Link href="/configuracion/modulo/finanzas?seccion=flujo-caja" className="text-accent underline">
            Filas y ajustes
          </Link>
        </p>
      ) : null}
      {gestiona ? (
        <>
          <HojaCelda
            abierta={!!seleccion}
            onCerrar={() => setSeleccion(null)}
            contexto={seleccion && p ? celdaEditable(p, seleccion.filaId, seleccion.semana) : null}
          />
          <HojaMover filas={p?.filas ?? []} semanas={p?.semanas.map((s) => s.semana) ?? []} />
          {cierra ? <HojaCierre semanas={p?.semanas ?? []} /> : null}
        </>
      ) : null}
    </div>
  );
}

function Meta({ titulo, meta, real }: { titulo: string; meta: string; real: string }) {
  return (
    <div>
      <div className="font-medium text-fg">{titulo}</div>
      <div className="text-fg-muted">
        Meta {meta} · Real {real}
      </div>
    </div>
  );
}
