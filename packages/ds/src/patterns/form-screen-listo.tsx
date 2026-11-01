import type { FormHTMLAttributes, ReactNode } from "react";

import { cn } from "../cn";

export type SeccionFormulario = {
  id: string;
  titulo: string;
  descripcion?: string;
  contenido: ReactNode;
};

export type FormScreenListoProps = {
  cabecera: ReactNode;
  secciones: readonly SeccionFormulario[];
  /** Botones: fijos abajo en teléfono (48px), a la derecha en md+. */
  acciones: ReactNode;
  /** Resumen (totales) visible junto a las acciones. */
  resumen?: ReactNode;
  formProps?: FormHTMLAttributes<HTMLFormElement>;
};

/** Formulario por secciones con barra de acciones fija en teléfono. */
export function FormScreenListo({
  cabecera,
  secciones,
  acciones,
  resumen,
  formProps,
}: FormScreenListoProps) {
  return (
    <section>
      {cabecera}
      <FormularioSecciones
        secciones={secciones}
        acciones={acciones}
        resumen={resumen}
        {...(formProps ? { formProps } : {})}
      />
    </section>
  );
}

export function FormularioSecciones({
  secciones,
  acciones,
  resumen,
  formProps,
}: Omit<FormScreenListoProps, "cabecera">) {
  return (
    <form {...formProps} className={cn("flex flex-col gap-4", formProps?.className)}>
      {secciones.map((s) => (
        <fieldset key={s.id} className="rounded-lg border border-border bg-surface p-4">
          <legend className="t-subheading px-1 text-fg">{s.titulo}</legend>
          {s.descripcion ? <p className="t-caption mb-3">{s.descripcion}</p> : null}
          <div className="flex flex-col gap-4">{s.contenido}</div>
        </fieldset>
      ))}
      <div
        className={cn(
          "sticky bottom-[calc(56px+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-col gap-3 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur",
          "md:static md:mx-0 md:flex-row md:items-center md:justify-end md:rounded-lg md:border md:bg-surface md:py-3",
        )}
      >
        {resumen ? (
          <div className="t-numeric text-base font-normal text-fg md:mr-auto">{resumen}</div>
        ) : null}
        <div className="flex gap-2 [&>*]:h-12 [&>*]:flex-1 md:[&>*]:h-10 md:[&>*]:flex-none">
          {acciones}
        </div>
      </div>
    </form>
  );
}
