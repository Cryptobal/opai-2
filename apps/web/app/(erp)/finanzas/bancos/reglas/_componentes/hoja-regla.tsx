"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Combobox, Input, Segmentado, Select, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Destinos } from "../../_componentes/destinos";
import { EditorCondiciones } from "./editor-condiciones";
import { PruebaRegla, type ResultadoPrueba } from "./prueba-regla";
import { entradaGuardar, type AlcanceRegla, type BorradorRegla } from "./tipos-reglas";

/** Editor de una regla del banco (CAR-328): alcance, condiciones, destino y vista previa de lo que calzaría. */
export function HojaRegla({
  inicial,
  destinos,
  onCerrar,
}: {
  inicial: BorradorRegla;
  destinos: Destinos | null;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [b, setB] = useState(inicial);
  const [prueba, setPrueba] = useState<ResultadoPrueba | null>(null);
  const set = (p: Partial<BorradorRegla>) => {
    setB((x) => ({ ...x, ...p }));
    setPrueba(null);
  };
  const seccion = b.alcance === "abonos" ? "ingreso" : b.alcance === "cargos" ? "egreso" : null;
  const filas = (destinos?.filas ?? []).filter((f) => !seccion || f.seccion === seccion);
  const completa = b.nombre.trim().length >= 2 && !!b.flujoFilaId && b.condiciones.every((c) => c.valor.trim());

  async function probar() {
    limpiarError();
    const r = await ejecutar<ResultadoPrueba>("finanzas.reglas_banco.probar", {
      modo: b.modo,
      definicion: entradaGuardar(b).definicion,
    });
    if (r) setPrueba(r);
  }

  async function guardar() {
    limpiarError();
    const input = entradaGuardar(b);
    if (!(await ejecutar("finanzas.reglas_banco.guardar", input, true))) return;
    if (await ejecutar("finanzas.reglas_banco.guardar", input)) {
      avisar.exito(b.id ? "Regla actualizada" : "Regla creada");
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={b.id ? "Editar regla" : "Nueva regla"}
      descripcion="Clasifica los movimientos del banco que cumplen las condiciones."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Descartar cambios
          </Button>
          <Button disabled={pendiente || !completa} onClick={() => void guardar()}>
            Guardar regla
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Campo etiqueta="Nombre" htmlFor="regla-nombre">
            <Input id="regla-nombre" value={b.nombre} onChange={(e) => set({ nombre: e.target.value })} />
          </Campo>
          <Campo etiqueta="Prioridad" htmlFor="regla-prioridad" ayuda="Mayor se evalúa antes.">
            <Input
              id="regla-prioridad"
              inputMode="numeric"
              value={String(b.prioridad)}
              onChange={(e) => set({ prioridad: Math.min(1000, Number(e.target.value.replace(/\D/g, "")) || 0) })}
            />
          </Campo>
        </div>
        <Segmentado
          etiqueta="Alcance"
          activa={b.alcance}
          opciones={(["abonos", "cargos", "ambos"] as AlcanceRegla[]).map((a) => ({
            id: a,
            etiqueta: a === "abonos" ? "Abonos" : a === "cargos" ? "Cargos" : "Ambos",
            onClick: () => set({ alcance: a, flujoFilaId: null }),
          }))}
        />
        <Campo etiqueta="El movimiento cumple" htmlFor="regla-modo">
          <Select
            id="regla-modo"
            valor={b.modo}
            opciones={[
              { valor: "todas", etiqueta: "Todas las condiciones" },
              { valor: "alguna", etiqueta: "Alguna condición" },
            ]}
            onCambiar={(v) => set({ modo: v === "alguna" ? "alguna" : "todas" })}
          />
        </Campo>
        <EditorCondiciones condiciones={b.condiciones} onCambiar={(condiciones) => set({ condiciones })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Fila del flujo" htmlFor="regla-fila">
            <Combobox
              id="regla-fila"
              aria-label="Fila del flujo"
              placeholder="Elige la fila"
              valor={b.flujoFilaId}
              opciones={filas.map((f) => ({ valor: f.id, etiqueta: f.etiqueta, detalle: f.seccion === "ingreso" ? "Ingresos" : "Egresos" }))}
              onCambiar={(v) => set({ flujoFilaId: v[0] ?? null })}
            />
          </Campo>
          <Campo etiqueta="Cuenta contable (opcional)" htmlFor="regla-cuenta">
            <Combobox
              id="regla-cuenta"
              aria-label="Cuenta contable"
              placeholder="Sin cuenta"
              disabled={!destinos?.cuentas.length}
              valor={b.cuentaContableId}
              opciones={(destinos?.cuentas ?? []).map((c) => ({ valor: c.id, etiqueta: `${c.codigo} ${c.nombre}` }))}
              onCambiar={(v) => set({ cuentaContableId: v[0] ?? null })}
            />
          </Campo>
        </div>
        <Switch etiqueta="Regla activa" activo={b.activa} onCambiar={(activa) => set({ activa })} />
        <PruebaRegla resultado={prueba} pendiente={pendiente} habilitada={b.condiciones.every((c) => c.valor.trim())} onProbar={() => void probar()} />
      </div>
    </Sheet>
  );
}
