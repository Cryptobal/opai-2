"use client";

import { Upload } from "lucide-react";
import type { RefObject } from "react";

import { Button, cn, Empty, Textarea } from "@opai/ds";

import type { ModoEditor } from "./barra-editor";
import { HojaPlantilla } from "./hoja-plantilla";
type Props = {
  area: RefObject<HTMLTextAreaElement | null>;
  texto: string;
  onTexto: (t: string) => void;
  pendiente: boolean;
  modo: ModoEditor;
  titulo: string;
};

/**
 * Área del texto (diseño 06). En md+ con «Editar», el texto plano con variables `{grupo.clave}`,
 * `**negrita**` y `*cursiva*`; con «Vista previa» y siempre en el teléfono, la hoja con las
 * variables resaltadas. Plantilla en blanco: el vacío del diseño (importar llega con la pantalla 09).
 */
export function Visor({ area, texto, onTexto, pendiente, modo, titulo }: Props) {
  const editar = modo === "editar";
  const vacio = texto.trim() === "";
  return (
    <div className="flex min-h-[520px] justify-center rounded-lg border border-border bg-fill p-3 md:min-h-[500px] md:p-5">
      <Textarea
        ref={area}
        aria-label="Texto de la plantilla"
        value={texto}
        onChange={(ev) => onTexto(ev.target.value)}
        disabled={pendiente}
        placeholder="Escribe el texto. Separa los párrafos con una línea en blanco e inserta variables desde el panel."
        spellCheck
        className={cn(
          "min-h-[460px] max-w-[600px] resize-y bg-paper font-sans leading-6 text-paper-fg",
          editar ? "hidden md:block" : "hidden",
        )}
      />
      <div className={cn("w-full", editar ? "md:hidden" : "")}>
        {vacio ? (
          <Empty
            className="mx-auto max-w-[600px] bg-paper"
            titulo="La plantilla está en blanco"
            descripcion="Escribe el texto en un computador o importa un Word o PDF que ya uses."
            accion={
              <Button
                variant="secondary"
                size="lg"
                disabled
                title="Importar Word o PDF llega más adelante"
              >
                <Upload aria-hidden className="size-4" />
                Importar Word o PDF
              </Button>
            }
          />
        ) : (
          <HojaPlantilla titulo={titulo} texto={texto} />
        )}
      </div>
    </div>
  );
}
