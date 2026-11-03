"use client";

import { formatearClp } from "@opai/domain";
import { Campo, Input, InputFecha, Select } from "@opai/ds";

import { InputPesos } from "@/app/_components/maestros/input-pesos";

import type { ConfigComercial, ItemCatalogo } from "./tipos";

export type DatosNegocio = {
  titulo: string;
  tipoId: string;
  origenId: string;
  cierreEstimado: string;
  inicioServicioEstimado: string;
  monto: string;
  probabilidad: string;
};

/** Opciones activas de un catálogo, más la actual si se desactivó (los negocios la conservan). */
const opciones = (items: ItemCatalogo[], actual: string) =>
  items
    .filter((i) => i.activo || i.id === actual)
    .map((i) => ({ valor: i.id, etiqueta: i.nombre }));

type Props = {
  d: DatosNegocio;
  set: <K extends keyof DatosNegocio>(k: K, v: DatosNegocio[K]) => void;
  config: ConfigComercial;
  /** Editar: probabilidad e inicio de servicio; el monto se bloquea si lo fija una cotización. */
  editar?: { montoBloqueado: boolean };
};

/** Campos de un negocio (Nuevo y Editar), con los textos del export aprobado. */
export function CamposNegocio({ d, set, config, editar }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Campo
        etiqueta="Nombre del negocio"
        htmlFor="neg-titulo"
        ayuda="Por ejemplo «Guardias 24/7 · Bodega Pudahuel»."
      >
        <Input
          id="neg-titulo"
          value={d.titulo}
          maxLength={120}
          onChange={(e) => set("titulo", e.target.value)}
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Tipo" htmlFor="neg-tipo">
          <Select
            id="neg-tipo"
            valor={d.tipoId || undefined}
            onCambiar={(v) => set("tipoId", v)}
            opciones={opciones(config.tipos, d.tipoId)}
            placeholder="Elige un tipo"
          />
        </Campo>
        <Campo etiqueta="Origen" htmlFor="neg-origen">
          <Select
            id="neg-origen"
            valor={d.origenId || undefined}
            onCambiar={(v) => set("origenId", v)}
            opciones={opciones(config.origenes, d.origenId)}
            placeholder="Elige un origen"
          />
        </Campo>
        <Campo etiqueta="Cierre estimado" htmlFor="neg-cierre">
          <InputFecha
            id="neg-cierre"
            valor={d.cierreEstimado}
            onCambiar={(v) => set("cierreEstimado", v)}
          />
        </Campo>
        {editar ? (
          <Campo etiqueta="Inicio del servicio" htmlFor="neg-inicio">
            <InputFecha
              id="neg-inicio"
              valor={d.inicioServicioEstimado}
              onCambiar={(v) => set("inicioServicioEstimado", v)}
            />
          </Campo>
        ) : null}
      </div>
      <Campo
        etiqueta="Valor mensual estimado"
        htmlFor="neg-monto"
        ayuda={
          editar?.montoBloqueado
            ? "Lo fija la cotización vigente; no se edita a mano."
            : "Se reemplaza por el total de la cotización cuando exista."
        }
      >
        {editar?.montoBloqueado ? (
          <Input
            id="neg-monto"
            disabled
            value={d.monto ? formatearClp(Number(d.monto)) : ""}
            readOnly
          />
        ) : (
          <InputPesos id="neg-monto" valor={d.monto} onCambiar={(v) => set("monto", v)} />
        )}
      </Campo>
      {editar ? (
        <Campo etiqueta="Probabilidad (%)" htmlFor="neg-prob" ayuda="Por defecto, la de la etapa.">
          <Input
            id="neg-prob"
            inputMode="numeric"
            className="t-numeric"
            value={d.probabilidad}
            onChange={(e) => set("probabilidad", e.target.value.replace(/\D/g, "").slice(0, 3))}
          />
        </Campo>
      ) : null}
    </div>
  );
}

/** Campos del formulario → input de `comercial.negocios.create/update` (vacío = null). */
export function camposAInput(d: DatosNegocio, conMonto: boolean) {
  const prob = d.probabilidad === "" ? undefined : Math.min(100, Number(d.probabilidad));
  return {
    titulo: d.titulo.trim(),
    tipoId: d.tipoId || null,
    origenId: d.origenId || null,
    cierreEstimado: d.cierreEstimado || null,
    ...(conMonto ? { montoEstimadoMensual: d.monto ? Number(d.monto) : null } : {}),
    ...(prob !== undefined ? { probabilidad: prob } : {}),
  };
}
