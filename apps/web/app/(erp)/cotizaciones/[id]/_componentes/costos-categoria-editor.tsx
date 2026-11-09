"use client";

import { useEffect, useMemo, useState } from "react";

import { Alerta, avisar, Button, Pares, Sheet, Skeleton } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";
import { margenPctTexto } from "@/lib/cpq-presentacion";

import { BotonCargarPredefinidos } from "./boton-cargar-predefinidos";
import { FilaCostoCategoria, GLOBAL, type FilaCosto, type PuestoOpcion } from "./costos-categoria-fila";

type Lista = {
  items: { id: string; categoria: string; montoClp: number; lineaId: string | null }[];
  categorias: { id: string; nombre: string }[];
};
type Previa = { ventaMensualClp: number | null; costoMensualClp: number; margenEfectivoPct: number };

let contador = 0;
const nueva = (categoria: string): FilaCosto => ({ clave: `n${++contador}`, categoria, alcance: GLOBAL, monto: "" });
const claveDe = (f: FilaCosto) => `${f.alcance}:${f.categoria}`;

/** Entrada de `cpq.costos_categoria.guardar`: filas sin monto no viajan. */
const entradaDe = (filas: FilaCosto[]) =>
  filas
    .filter((f) => f.monto !== "")
    .map((f) => ({ categoria: f.categoria, montoClp: Number.parseInt(f.monto, 10), lineaId: f.alcance === GLOBAL ? null : f.alcance }));

/**
 * Edita los costos por categoría de la versión: cada uno va a un puesto o a toda la cotización.
 * Muestra el efecto en venta, costo y margen (vista previa en el servidor) antes de guardar.
 */
export function EditorCostosCategoria({
  versionId,
  puestos,
  onCerrar,
  onGuardado,
}: {
  versionId: string;
  puestos: PuestoOpcion[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [lista, setLista] = useState<Lista | null>(null);
  const [filas, setFilas] = useState<FilaCosto[]>([]);
  const [previa, setPrevia] = useState<Previa | null>(null);

  useEffect(() => {
    void ejecutar<Lista>("cpq.costos_categoria.list", { versionId }, false, "ninguna").then((r) => {
      if (!r) return;
      setLista(r);
      setFilas(r.items.map((i) => ({ clave: i.id, categoria: i.categoria, alcance: i.lineaId ?? GLOBAL, monto: String(i.montoClp) })));
    });
  }, [ejecutar, versionId]);

  const claves = filas.map(claveDe);
  const duplicada = (f: FilaCosto) => claves.filter((c) => c === claveDe(f)).length > 1;
  const hayDuplicadas = filas.some(duplicada);
  const entrada = useMemo(() => entradaDe(filas), [filas]);

  useEffect(() => {
    if (!lista || hayDuplicadas) return;
    const t = setTimeout(() => {
      void ejecutar<Previa>("cpq.costos_categoria.guardar", { versionId, items: entrada }, true, "ninguna").then((r) => r && setPrevia(r));
    }, 400);
    return () => clearTimeout(t);
  }, [ejecutar, lista, entrada, hayDuplicadas, versionId]);

  async function guardar() {
    const r = await ejecutar("cpq.costos_categoria.guardar", { versionId, items: entrada });
    if (r != null) {
      avisar.exito("Costos por categoría guardados");
      onGuardado();
      onCerrar();
    }
  }

  return (
    <Sheet abierto titulo="Costos por categoría" onCerrar={onCerrar}>
      <div className="space-y-4 p-4">
        <p className="t-caption text-fg-subtle">
          Suma un costo mensual a una categoría y elige si es de un puesto o de toda la cotización. Los totales y el margen se recalculan.
        </p>
        <BotonCargarPredefinidos versionId={versionId} onListo={() => { onGuardado(); onCerrar(); }} />
        {!lista ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            {filas.length === 0 ? (
              <Alerta tono="neutral" titulo="Aún no hay costos manuales. Agrega uno para sumarlo al cálculo." />
            ) : null}
            <ul className="space-y-3">
              {filas.map((f) => (
                <FilaCostoCategoria
                  key={f.clave}
                  fila={f}
                  categorias={lista.categorias}
                  puestos={puestos}
                  duplicada={duplicada(f)}
                  onCambiar={(c) => setFilas((p) => p.map((x) => (x.clave === f.clave ? { ...x, ...c } : x)))}
                  onQuitar={() => setFilas((p) => p.filter((x) => x.clave !== f.clave))}
                />
              ))}
            </ul>
            <Button type="button" variant="secondary" onClick={() => setFilas((p) => [...p, nueva(lista.categorias[0]?.id ?? "otros")])}>
              Agregar costo
            </Button>
            {previa ? (
              <Pares
                items={[
                  { etiqueta: "Venta mensual", valor: previa.ventaMensualClp == null ? "—" : pesos(previa.ventaMensualClp), numerico: true },
                  { etiqueta: "Costo mensual", valor: pesos(previa.costoMensualClp), numerico: true },
                  { etiqueta: "Margen efectivo", valor: margenPctTexto(previa.margenEfectivoPct), numerico: true },
                ]}
              />
            ) : null}
          </>
        )}
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente || !lista || hayDuplicadas} onClick={() => void guardar()}>
            Guardar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
