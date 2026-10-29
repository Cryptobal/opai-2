"use client";

import { MoreHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { avisar, type ItemMenu, Menu } from "@opai/ds";

import { useBajoLg, usePinFicha } from "../pin-ficha-contexto";
import { useCapacidad } from "../use-capacidad";
import type { Confirmacion } from "./dialogo-confirmar";
import { useParametros } from "./use-url";

const DialogoConfirmar = dynamic(() =>
  import("./dialogo-confirmar").then((m) => m.DialogoConfirmar),
);

/** Acción del menú ⋯ de una ficha: abrir una hoja por URL o ejecutar una capacidad. */
export type AccionEntidad = {
  id: string;
  etiqueta: string;
  grupo?: string;
  peligro?: boolean;
  /** Abre una hoja (`?editar=1`). */
  parametro?: { clave: string; valor: string };
  capacidad?: { id: string; input: Record<string, unknown>; exito: string };
  /** Pide confirmación (y, si `motivo`, un texto que va como `motivo` en el input). */
  confirmar?: Confirmacion;
};

/** Menú ⋯ de una ficha (Editar, Cambiar estado, Archivar…), con confirmación y aviso. */
export function AccionesEntidad({
  acciones,
  etiqueta,
}: {
  acciones: AccionEntidad[];
  etiqueta: string;
}) {
  const { fijar } = useParametros();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [confirmando, setConfirmando] = useState<AccionEntidad | null>(null);
  const pin = usePinFicha();
  const bajoLg = useBajoLg();
  async function correr(a: AccionEntidad, motivo?: string) {
    if (!a.capacidad) return;
    const r = await ejecutar(a.capacidad.id, {
      ...a.capacidad.input,
      ...(motivo ? { motivo } : {}),
    });
    if (r) {
      avisar.exito(a.capacidad.exito);
      setConfirmando(null);
    }
  }
  const items: ItemMenu[] = acciones.map((a) => ({
    id: a.id,
    etiqueta: a.etiqueta,
    ...(a.grupo ? { grupo: a.grupo } : {}),
    ...(a.peligro ? { peligro: true } : {}),
    onSelect: () => {
      if (a.parametro) fijar({ [a.parametro.clave]: a.parametro.valor });
      else if (a.confirmar) setConfirmando(a);
      else void correr(a);
    },
  }));
  // Bajo 1024 px «Fijar» deja la cabecera y va aquí, tras la primera acción (CAR-65): así no cae bajo
  // el encabezado de un grupo («Cambiar estado») ni junto a lo destructivo.
  if (pin && bajoLg) {
    items.splice(Math.min(1, items.length), 0, {
      id: "fijar-ficha",
      etiqueta: pin.fijado ? "Desfijar" : "Fijar",
      onSelect: pin.onFijar,
    });
  }
  // Sin acciones (p. ej. un cargo de solo lectura) y sin «Fijar», no hay menú que mostrar.
  if (items.length === 0) return null;
  return (
    <>
      <Menu
        etiqueta={etiqueta}
        items={items}
        disparador={<MoreHorizontal className="size-5" />}
        claseDisparador="border border-border-strong bg-surface md:size-11"
      />
      {confirmando?.confirmar ? (
        <DialogoConfirmar
          confirmacion={confirmando.confirmar}
          pendiente={pendiente}
          error={error}
          onCerrar={() => setConfirmando(null)}
          onConfirmar={(motivo) => void correr(confirmando, motivo)}
        />
      ) : null}
    </>
  );
}
