"use client";

import type { ReactNode } from "react";

import {
  Button,
  Campo,
  DashboardScreen,
  type EstadoPantalla,
  FormScreen,
  Input,
  PlanillaScreen,
} from "@opai/ds";

import { SelectMuestra } from "./componentes-nuevos/select-muestra";
import { celdaPauta, COLUMNAS_PAUTA, FILAS_PAUTA, KPIS } from "./datos";

export function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{titulo}</h2>
      {children}
    </section>
  );
}

export function BloqueFormulario({ state }: { state: EstadoPantalla }) {
  return (
    <Bloque titulo="FormScreen · Nueva cotización">
      <FormScreen
        state={state}
        titulo="Nueva cotización"
        secciones={[
          {
            id: "cliente",
            titulo: "Cliente",
            contenido: (
              <div className="grid gap-4 md:grid-cols-2">
                <Campo etiqueta="Cliente" htmlFor="c">
                  <SelectMuestra id="c" opciones={["Logística Andina SpA", "Clínica Las Condes"]} />
                </Campo>
                <Campo etiqueta="Instalación" htmlFor="i">
                  <SelectMuestra id="i" opciones={["Planta Quilicura"]} />
                </Campo>
              </div>
            ),
          },
          {
            id: "puestos",
            titulo: "Puestos",
            descripcion: "Cargo, cantidad, turno y monto mensual por puesto.",
            contenido: (
              <div className="grid gap-4 md:grid-cols-4">
                <Campo etiqueta="Cargo" htmlFor="cargo">
                  <SelectMuestra id="cargo" opciones={["Guardia"]} />
                </Campo>
                <Campo etiqueta="Cantidad" htmlFor="cant">
                  <Input id="cant" type="number" inputMode="numeric" defaultValue={3} />
                </Campo>
                <Campo etiqueta="Turno" htmlFor="turno">
                  <SelectMuestra id="turno" opciones={["4x4 día y noche"]} />
                </Campo>
                <Campo etiqueta="Monto mensual (CLP)" htmlFor="monto" ayuda="Sin IVA">
                  <Input
                    id="monto"
                    inputMode="numeric"
                    defaultValue="1.850.000"
                    className="t-mono text-md"
                  />
                </Campo>
              </div>
            ),
          },
        ]}
        resumen={
          <span className="tabular-nums">
            Subtotal $ 5.550.000 · IVA $ 1.054.500 · <strong>Total $ 6.604.500</strong>
          </span>
        }
        acciones={
          <>
            <Button variant="secondary">Guardar borrador</Button>
            <Button>Enviar</Button>
          </>
        }
        formProps={{ onSubmit: (e) => e.preventDefault() }}
      />
    </Bloque>
  );
}

export function BloquePlanillaYDashboard({ state }: { state: EstadoPantalla }) {
  return (
    <>
      <Bloque titulo="PlanillaScreen · Pauta mensual">
        <PlanillaScreen
          state={state}
          titulo="Pauta mensual"
          subtitulo="Noviembre 2026 · Planta Quilicura"
          filas={FILAS_PAUTA}
          columnas={COLUMNAS_PAUTA}
          celda={celdaPauta}
        />
      </Bloque>
      <Bloque titulo="DashboardScreen · Finanzas">
        <DashboardScreen state={state} titulo="Finanzas" subtitulo="Octubre 2026" kpis={KPIS}>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-medium text-fg-muted">Flujo semanal</p>
            <div className="mt-3 h-40 rounded-md bg-bg" />
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-medium text-fg-muted">Facturas vencidas</p>
            <ul className="mt-3 flex flex-col gap-2 text-base">
              <li className="flex justify-between">
                <span>Clínica Las Condes · F-1042</span>
                <span className="tabular-nums text-danger">$ 4.120.000</span>
              </li>
              <li className="flex justify-between">
                <span>Bodega Pudahuel · F-1038</span>
                <span className="tabular-nums text-danger">$ 2.980.000</span>
              </li>
            </ul>
          </div>
        </DashboardScreen>
      </Bloque>
    </>
  );
}
