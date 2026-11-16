"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { FilaEgreso } from "./tipos";

const NUEVA = "__nueva";
const HREF_FILAS = "/finanzas/flujo/recurrentes?filas=1";

/** Selector de fila de egreso con «+ Nueva fila…» (CAR-535) y enlace a administrar filas. */
export function SelectorFilaEgreso(p: {
  valor: string;
  onCambiar: (id: string) => void;
  filas: FilaEgreso[];
  disabled?: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [lista, setLista] = useState(p.filas);
  const [previas, setPrevias] = useState(p.filas);
  if (p.filas !== previas) {
    setPrevias(p.filas);
    setLista(p.filas);
  }
  const [pedir, setPedir] = useState(false);
  const [nombre, setNombre] = useState("");
  const opciones = [
    ...lista.filter((f) => f.activa).map((f) => ({ valor: f.id, etiqueta: f.etiqueta })),
    ...(p.disabled ? [] : [{ valor: NUEVA, etiqueta: "+ Nueva fila…" }]),
  ];

  async function crear() {
    const etiqueta = nombre.trim();
    if (etiqueta.length < 2) return;
    const r = await ejecutar<FilaEgreso>("finanzas.filas.crear", {
      seccion: "egreso",
      etiqueta,
      arrastre: false,
    });
    if (!r) return;
    setLista((l) => (l.some((x) => x.id === r.id) ? l : [...l, r]));
    p.onCambiar(r.id);
    setNombre("");
    setPedir(false);
    avisar.exito("Fila creada");
  }

  return (
    <div className="flex flex-col gap-2">
      <Campo etiqueta="Fila del flujo" htmlFor="rc-fila">
        <Select
          id="rc-fila"
          valor={p.valor || undefined}
          onCambiar={(v) => {
            if (v === NUEVA) {
              setPedir(true);
              return;
            }
            setPedir(false);
            p.onCambiar(v);
          }}
          {...(p.disabled ? { disabled: true } : {})}
          opciones={opciones}
          placeholder="Elige una fila"
        />
      </Campo>
      {pedir ? (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <Campo etiqueta="Nombre de la fila" htmlFor="rc-fila-nueva" ayuda="P. ej. Pago crédito, Contador.">
            <Input
              id="rc-fila-nueva"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void crear();
                }
              }}
            />
          </Campo>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPedir(false);
                setNombre("");
              }}
            >
              Cancelar
            </Button>
            <Button disabled={pendiente || nombre.trim().length < 2} onClick={() => void crear()}>
              {pendiente ? "Creando…" : "Crear fila"}
            </Button>
          </div>
        </div>
      ) : null}
      <LinkNext href={HREF_FILAS} className="self-start text-sm text-accent underline">
        Administrar filas
      </LinkNext>
    </div>
  );
}
