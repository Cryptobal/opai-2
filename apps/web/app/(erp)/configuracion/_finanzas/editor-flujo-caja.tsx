"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Checkbox, Campo, Input } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CalendarioPagosEditor } from "./calendario-pagos";
import type { FilaFlujo, AjustesFlujo } from "@/app/(erp)/finanzas/flujo/_componentes/datos";

export function EditorFlujoCaja({
  filas,
  ajustes,
}: {
  filas: FilaFlujo[];
  ajustes: AjustesFlujo;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [etiqueta, setEtiqueta] = useState("");
  const [aj, setAj] = useState(ajustes);
  // La lista se actualiza al instante con lo que devuelve cada capacidad y se vuelve a alinear cuando el
  // servidor revalida la página (CAR-198/CAR-220).
  const [lista, setLista] = useState(filas);
  useEffect(() => setLista(filas), [filas]);
  const ingresos = lista.filter((f) => f.seccion === "ingreso");
  const egresos = lista.filter((f) => f.seccion === "egreso");

  const poner = (f: FilaFlujo) =>
    setLista((l) => (l.some((x) => x.id === f.id) ? l.map((x) => (x.id === f.id ? f : x)) : [...l, f]));

  async function crearFila() {
    const r = await ejecutar<FilaFlujo>("finanzas.filas.crear", { seccion: "egreso", etiqueta, arrastre: false });
    if (!r) return;
    poner(r);
    avisar.exito("Egreso creado");
    setEtiqueta("");
  }

  async function archivarFila(id: string, archivar: boolean) {
    const r = await ejecutar<FilaFlujo>("finanzas.filas.archivar", { id, archivar });
    if (!r) return;
    poner(r);
    avisar.exito(archivar ? "Fila archivada" : "Fila restaurada");
  }

  async function guardarAjustes() {
    const r = await ejecutar("finanzas.ajustes.actualizar", aj);
    if (!r) return;
    avisar.exito("Ajustes guardados");
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-fg">Ingresos</h2>
        <p className="text-sm text-fg-muted">
          Los ingresos salen solos de lo facturado y cobrado; no se crean a mano.
        </p>
        <ul className="text-sm text-fg-muted">
          {ingresos.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-1">
              <span>{f.etiqueta}{f.activa ? "" : " · archivada"}</span>
              {f.activa ? null : (
                <Button variant="ghost" disabled={pendiente} onClick={() => void archivarFila(f.id, false)}>
                  Restaurar
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-fg">Egresos planificados</h2>
        <p className="text-sm text-fg-muted">
          Archivar deja la fila de mostrarse; no borra lo registrado. Puedes restaurarla cuando quieras.
        </p>
        <ul className="text-sm text-fg-muted">
          {egresos.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-1">
              <span>{f.etiqueta}{f.activa ? "" : " · archivada"}</span>
              <Button variant="ghost" disabled={pendiente} onClick={() => void archivarFila(f.id, f.activa)}>
                {f.activa ? "Archivar" : "Restaurar"}
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <Campo etiqueta="Nuevo egreso (p. ej. Arriendo)" htmlFor="ff-etiq">
            <Input id="ff-etiq" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} />
          </Campo>
          <Button disabled={pendiente || etiqueta.trim().length < 2} onClick={() => void crearFila()}>
            Agregar egreso
          </Button>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-fg">Saldo inicial y aviso</h2>
        <Campo etiqueta="Saldo inicial (CLP)" htmlFor="aj-si">
          <Input
            id="aj-si"
            value={String(aj.saldoInicial)}
            onChange={(e) => setAj({ ...aj, saldoInicial: Number(e.target.value) || 0 })}
            inputMode="numeric"
          />
        </Campo>
        <Campo etiqueta="Umbral de saldo bajo (CLP)" htmlFor="aj-um">
          <Input
            id="aj-um"
            value={String(aj.umbral)}
            onChange={(e) => setAj({ ...aj, umbral: Number(e.target.value) || 0 })}
            inputMode="numeric"
          />
        </Campo>
        <Campo etiqueta="Semana desde (lunes ISO)" htmlFor="aj-des">
          <Input
            id="aj-des"
            value={aj.desde}
            onChange={(e) => setAj({ ...aj, desde: e.target.value })}
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
        <p className="text-sm text-fg-muted">
          Día del mes en que se paga cada concepto, para proyectar el flujo de caja.
        </p>
        <CalendarioPagosEditor
          valor={aj.calendarioPagos}
          onCambiar={(v) => setAj({ ...aj, calendarioPagos: v })}
        />
      </section>
    </div>
  );
}
