"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { CorreoItem } from "./correo-item";
import { type CorreoVista, type PaginaCorreos, sePuedeAsociar } from "./tipos";

// Se carga aparte para no sumar al primer JS de la ficha (ADR-037).
const AsociarNegocio = dynamic(() => import("./asociar-negocio").then((m) => m.AsociarNegocio));

/** «Ver correos anteriores»: pide la página siguiente del historial con el cursor y la agrega abajo. */
export function MasCorreos(p: {
  entidadTipo: "cuenta" | "contacto" | "negocio";
  entidadId: string;
  cursor: string;
  puedeAsociar: boolean;
}) {
  const [items, setItems] = useState<CorreoVista[]>([]);
  const [cursor, setCursor] = useState<string | null>(p.cursor);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState(false);
  async function cargar() {
    if (!cursor) return;
    setPendiente(true);
    try {
      const r = await ejecutarCapacidad(
        "erp",
        "core.correos.historial",
        { entidadTipo: p.entidadTipo, entidadId: p.entidadId, cursor },
        false,
        "ninguna",
      );
      setError(!r.ok);
      if (r.ok) {
        const d = r.data as PaginaCorreos;
        setItems((prev) => [...prev, ...d.items]);
        setCursor(d.siguiente);
      }
    } catch {
      setError(true);
    } finally {
      setPendiente(false);
    }
  }
  return (
    <>
      {items.length ? (
        <ul className="flex flex-col gap-4">
          {items.map((c) => (
            <CorreoItem
              key={c.id}
              c={c}
              accion={
                sePuedeAsociar(c, p.entidadTipo, p.puedeAsociar) && c.cuentaId ? (
                  <AsociarNegocio correoId={c.id} cuentaId={c.cuentaId} contactoId={c.contactoId} />
                ) : null
              }
            />
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-danger-fg">
          No pudimos cargar más correos. Vuelve a intentarlo.
        </p>
      ) : null}
      {cursor ? (
        <Button variant="ghost" disabled={pendiente} onClick={() => void cargar()}>
          Ver correos anteriores
        </Button>
      ) : null}
    </>
  );
}
