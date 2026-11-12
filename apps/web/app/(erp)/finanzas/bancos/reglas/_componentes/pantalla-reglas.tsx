"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Empty, Estado, type EstadoPantalla } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { CuentaBanco } from "../../_componentes/bancos-tipos";
import type { Destinos } from "../../_componentes/destinos";
import { borradorDe, borradorNuevo, ETIQUETA_ALCANCE, type BorradorRegla, type ReglaBanco } from "./tipos-reglas";

const HojaRegla = dynamic(() => import("./hoja-regla").then((m) => ({ default: m.HojaRegla })));

type Props = {
  state: EstadoPantalla;
  reglas: ReglaBanco[];
  destinos: Destinos | null;
  cuentas: CuentaBanco[];
  gestiona: boolean;
};

/** Reglas del banco (CAR-328): se aplica la primera que calce, de mayor a menor prioridad (ADR-074). */
export function PantallaReglas({ state, reglas, destinos, cuentas, gestiona }: Props) {
  const [editando, setEditando] = useState<BorradorRegla | null>(null);
  const { ejecutar, pendiente, error } = useCapacidad("erp");

  async function aplicar() {
    let conciliados = 0;
    let sugeridos = 0;
    for (const [i, c] of cuentas.entries()) {
      const input = { cuentaId: c.id };
      const ok = await ejecutar("finanzas.reglas_banco.aplicar", input, true);
      const r = ok ? await ejecutar<{ conciliados: number; sugeridos: number }>("finanzas.reglas_banco.aplicar", input) : null;
      if (!r) {
        if (i > 0) avisar.error(`Se aplicó en ${i} de ${cuentas.length} cuentas; revisa el error y vuelve a intentar.`);
        return;
      }
      conciliados += r.conciliados;
      sugeridos += r.sugeridos;
    }
    avisar.exito(`Reglas aplicadas: ${conciliados} conciliados y ${sugeridos} sugeridos para revisar`);
  }

  return (
    <Estado state={state} variante="lista" textos={{ error: { titulo: "No pudimos cargar las reglas" } }}>
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="t-body-sm text-fg-muted">
            Se aplica la primera regla que calce, de mayor a menor prioridad. Concilian solas solo con monto y
            referencia exactos; si no, dejan el movimiento sugerido para que lo confirmes.
          </p>
          {gestiona ? (
            <div className="flex flex-wrap gap-2">
              {reglas.length && cuentas.length ? (
                <Button variant="secondary" disabled={pendiente} onClick={() => void aplicar()}>
                  Aplicar a lo pendiente
                </Button>
              ) : null}
              <Button variant="primary" onClick={() => setEditando(borradorNuevo())}>
                Nueva regla
              </Button>
            </div>
          ) : null}
        </div>
        {reglas.length === 0 ? (
          <Empty
            titulo="Sin reglas del banco"
            descripcion="Crea una regla para que los cargos y abonos que se repiten (Previred, arriendo, comisiones) lleguen solos a su fila del flujo."
            {...(gestiona
              ? { accion: <Button variant="primary" onClick={() => setEditando(borradorNuevo())}>Nueva regla</Button> }
              : {})}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {reglas.map((r) => (
              <li key={r.id} className="rowcard flex flex-wrap items-center gap-2 p-3">
                <span className="t-mono t-caption w-8 text-fg-muted">{r.prioridad}</span>
                <div className="min-w-0 flex-1">
                  <p className="t-body-sm font-medium break-words">{r.nombre}</p>
                  <p className="t-caption text-fg-muted">
                    {r.definicion ? ETIQUETA_ALCANCE[r.definicion.alcance] : "Formato anterior: edítala para que funcione"}
                    {r.filaEtiqueta ? ` · ${r.filaEtiqueta}` : " · Sin fila"}
                    {r.cuentaContable ? ` · ${r.cuentaContable}` : ""}
                  </p>
                </div>
                <Badge tono={r.activa ? "success" : "neutro"}>{r.activa ? "Activa" : "Inactiva"}</Badge>
                {gestiona ? (
                  <Button variant="secondary" onClick={() => setEditando(borradorDe(r))}>
                    Editar
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      {editando ? (
        <HojaRegla key={editando.id ?? "nueva"} inicial={editando} destinos={destinos} onCerrar={() => setEditando(null)} />
      ) : null}
    </Estado>
  );
}
