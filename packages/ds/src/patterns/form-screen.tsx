import type { FormHTMLAttributes, ReactNode } from "react";

import { cn } from "../cn";
import { Cabecera, Estado, type EstadoPantalla, type TextosEstado } from "./estado";

export type SeccionFormulario = {
  id: string;
  titulo: string;
  descripcion?: string;
  contenido: ReactNode;
};

export type FormScreenProps = {
  state: EstadoPantalla;
  titulo: string;
  subtitulo?: string;
  secciones: readonly SeccionFormulario[];
  /** Botones: fijos abajo en teléfono, a la derecha en md+. */
  acciones: ReactNode;
  /** Resumen (totales) visible junto a las acciones. */
  resumen?: ReactNode;
  textos?: TextosEstado;
  formProps?: FormHTMLAttributes<HTMLFormElement>;
};

/** Formulario por secciones con barra de acciones fija en teléfono. */
export function FormScreen({
  state,
  titulo,
  subtitulo,
  secciones,
  acciones,
  resumen,
  textos,
  formProps,
}: FormScreenProps) {
  return (
    <section>
      <Cabecera titulo={titulo} {...(subtitulo ? { subtitulo } : {})} />
      <Estado state={state} variante="formulario" {...(textos ? { textos } : {})}>
        <form {...formProps} className={cn("flex flex-col gap-4", formProps?.className)}>
          {secciones.map((s) => (
            <fieldset key={s.id} className="rounded-lg border border-border bg-surface p-4">
              <legend className="px-1 text-md font-semibold text-fg">{s.titulo}</legend>
              {s.descripcion ? <p className="mb-3 text-sm text-fg-muted">{s.descripcion}</p> : null}
              <div className="flex flex-col gap-4">{s.contenido}</div>
            </fieldset>
          ))}
          <div
            className={cn(
              "sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-col gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur",
              "md:static md:mx-0 md:flex-row md:items-center md:justify-end md:rounded-lg md:border",
            )}
          >
            {resumen ? <div className="text-base text-fg md:mr-auto">{resumen}</div> : null}
            <div className="flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none">{acciones}</div>
          </div>
        </form>
      </Estado>
    </section>
  );
}
