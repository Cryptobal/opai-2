"use client";

import { Lock, RotateCcw } from "lucide-react";
import { useId } from "react";

import { Badge } from "../components/badge";
import { Control, controlDe } from "./ajustes-control";

import type { PropsCampo as Props } from "./ajustes-control";

export type { CampoAjusteVista } from "./ajustes-control";

/** Fila de un ajuste: etiqueta y ayuda, control, "Restablecer" y "Fijado por OPAI". */
export function CampoAjusteControl(props: Props) {
  const { campo, origen, modificado, onRestablecer } = props;
  const id = useId();
  const plataforma = campo.ambito === "plataforma";
  const enLinea = controlDe(campo) === "switch";
  return (
    <div
      className={
        enLinea ? "flex items-center justify-between gap-4 py-3" : "flex flex-col gap-1.5 py-3"
      }
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <label htmlFor={id} className="min-w-0">
          <span className="t-label block text-fg">{campo.etiqueta}</span>
          {campo.ayuda ? <span className="t-caption block">{campo.ayuda}</span> : null}
        </label>
        {plataforma ? (
          <Badge tono="neutro" punto={false} className="flex-none">
            <Lock className="size-3" aria-hidden /> Fijado por OPAI
          </Badge>
        ) : !enLinea &&
          onRestablecer &&
          (origen === "tenant" || origen === "usuario") &&
          !modificado ? (
          <button
            type="button"
            onClick={onRestablecer}
            className="inline-flex min-h-8 flex-none items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Restablecer
          </button>
        ) : null}
      </div>
      <Control {...props} id={id} />
      {!enLinea && origen === "defecto" && !modificado ? (
        <p className="t-caption">Por defecto</p>
      ) : null}
    </div>
  );
}
