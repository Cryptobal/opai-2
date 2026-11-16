"use client";

import { Pencil } from "lucide-react";

import type { Contexto } from "../agente/tipos";
import { BotonFijarEnCabecera, useBajoLg, usePinFicha } from "../pin-ficha-contexto";
import { type AccionEntidad, AccionesEntidad } from "./acciones-entidad";
import { accionesSinEditar } from "./ficha-ruta";
import { EnlaceBotonHoja } from "./enlace-boton-hoja";

/** Cabecera estándar de ficha: [Editar] [Fijar] [⋯] (CAR-546). */
function AccionesFicha({
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
        <BotonFijarEnCabecera fijado={pin.fijado} onFijar={pin.onFijar} />
      ) : null}
      <AccionesEntidad etiqueta={etiqueta} acciones={secundarias} {...(agente ? { agente } : {})} />
    </div>
  );
}

type AgenteFicha = { contexto: Contexto; nombre: string; articulo: string };

/** Props repetidas en fichas piloto (CAR-546, simplicidad). */
export function AccionesCabeceraFicha({
  etiqueta,
  editarHref,
  acciones,
  agente,
}: {
  etiqueta: string;
  editarHref: string;
  acciones: AccionEntidad[];
  agente: AgenteFicha;
}) {
  return (
    <AccionesFicha etiqueta={etiqueta} editar={{ href: editarHref }} acciones={acciones} agente={agente} />
  );
}