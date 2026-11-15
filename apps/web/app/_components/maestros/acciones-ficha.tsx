"use client";

import { Pencil } from "lucide-react";

import { PinDiferido as BotonFijar } from "@opai/ds";

import type { Contexto } from "../agente/tipos";
import { useBajoLg, usePinFicha } from "../pin-ficha-contexto";
import { type AccionEntidad, AccionesEntidad } from "./acciones-entidad";
import { accionesSinEditar } from "./acciones-ficha-helpers";
import { EnlaceBotonHoja } from "./enlace-boton-hoja";

/** Cabecera estándar de ficha: [Editar] [Fijar] [⋯] (CAR-546). */
export function AccionesFicha({
  acciones,
  etiqueta,
  editar,
  agente,
}: {
  acciones: AccionEntidad[];
  etiqueta: string;
  editar?: { href: string; etiqueta?: string };
  agente?: { contexto: Contexto; nombre: string; articulo: string };
}) {
  const pin = usePinFicha();
  const bajoLg = useBajoLg();
  const secundarias = accionesSinEditar(acciones);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {editar ? (
        <EnlaceBotonHoja
          href={editar.href}
          icono={Pencil}
          variante="secondary"
          {...(editar.etiqueta ? { etiqueta: editar.etiqueta } : {})}
        >
          Editar
        </EnlaceBotonHoja>
      ) : null}
      {pin && !bajoLg ? (
        <BotonFijar variante="ficha" fijado={pin.fijado} onFijar={pin.onFijar} />
      ) : null}
      <AccionesEntidad etiqueta={etiqueta} acciones={secundarias} {...(agente ? { agente } : {})} />
    </div>
  );
}