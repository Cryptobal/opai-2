import type { FormHTMLAttributes, ReactNode } from "react";

import { FormularioSecciones } from "./form-screen-listo";
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
  /** Botones: fijos abajo en teléfono (48px), a la derecha en md+. */
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
        <FormularioSecciones
          secciones={secciones}
          acciones={acciones}
          resumen={resumen}
          {...(formProps ? { formProps } : {})}
        />
      </Estado>
    </section>
  );
}
