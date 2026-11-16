"use client";

import { useState } from "react";

import { avisar, Button, Checkbox, Campo, Input } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import type { AjustesFlujo, FilaFlujo } from "@/app/(erp)/finanzas/flujo/_componentes/datos";
import { CalendarioPagosEditor } from "./calendario-pagos";

export function EditorFlujoCaja({ ajustes }: { filas: FilaFlujo[]; ajustes: AjustesFlujo }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [aj, setAj] = useState(ajustes);

  async function guardarAjustes() {
    const r = await ejecutar("finanzas.ajustes.actualizar", aj);
    if (!r) return;
    avisar.exito("Ajustes guardados");
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-fg">Filas y gastos recurrentes</h2>
        <p className="text-sm text-fg-muted">
          Las filas de egreso y los montos fijos se administran en el flujo de caja, no aquí. Los ingresos salen de lo facturado y de los cobros programados.
        </p>
        <div className="flex flex-wrap gap-2">
          <EnlaceBoton href="/finanzas/flujo/recurrentes" variante="secondary">
            Gastos recurrentes
          </EnlaceBoton>
          <EnlaceBoton href="/finanzas/flujo/recurrentes?filas=1" variante="secondary">
            Administrar filas
          </EnlaceBoton>
        </div>
        <p className="text-sm text-fg-muted">
          Desde un gasto recurrente también puedes crear una fila nueva con «+ Nueva fila…».
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-fg">Aviso de saldo bajo</h2>
        <p className="t-caption text-fg-muted">
          El saldo del flujo es el que hay hoy en el banco (Web4Leads o las cartolas cargadas); no se ingresa a mano.
        </p>
        <Campo etiqueta="Umbral de saldo bajo (CLP)" htmlFor="aj-um">
          <Input
            id="aj-um"
            value={String(aj.umbral)}
            onChange={(e) => setAj({ ...aj, umbral: Number(e.target.value) || 0 })}
            inputMode="numeric"
          />
        </Campo>
        <Checkbox
          marcado={aj.avisoActivo}
          onCambiar={(m) => setAj({ ...aj, avisoActivo: m })}
          etiqueta="Aviso en OPAI cuando el saldo baja del umbral"
          descripcion="Un solo umbral para la planilla, el saldo proyectado y el saldo del banco. Avisa solo por la campana de OPAI, sin correos."
        />
        <Button disabled={pendiente} onClick={() => void guardarAjustes()}>
          Guardar ajustes
        </Button>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-fg">Calendario de pagos</h2>
        <p className="text-sm text-fg-muted">Día del mes en que se paga cada concepto, para proyectar el flujo de caja.</p>
        <CalendarioPagosEditor valor={aj.calendarioPagos} onCambiar={(v) => setAj({ ...aj, calendarioPagos: v })} />
        <Button disabled={pendiente} onClick={() => void guardarAjustes()}>
          Guardar calendario
        </Button>
      </section>
      <p className="text-sm text-fg-muted">
        <LinkNext href="/finanzas/flujo" className="text-accent underline">
          Volver al flujo de caja
        </LinkNext>
      </p>
    </div>
  );
}