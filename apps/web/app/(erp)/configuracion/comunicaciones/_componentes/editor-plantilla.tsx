"use client";

import { type ReactNode, useRef, useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Plantilla, Variable } from "./tipos";
import { VistaPrevia } from "./vista-previa";

export const FORM_PLANTILLA = "form-plantilla";

type Props = {
  evento: string;
  canal: string;
  inicial: Plantilla;
  variables: Variable[];
  remitente: string;
  historial: ReactNode;
};

/** Editor de plantilla (31): asunto y cuerpo con variables {{ruta}}, vista previa y publicar. */
export function EditorPlantilla({
  evento,
  canal,
  inicial,
  variables,
  remitente,
  historial,
}: Props) {
  const { ejecutar, error } = useCapacidad("erp");
  const [asunto, setAsunto] = useState(inicial.asunto);
  const [cuerpo, setCuerpo] = useState(inicial.cuerpo);
  // Última posición del cursor (campo y selección) para insertar la variable ahí.
  const sel = useRef<{ campo: "asunto" | "cuerpo"; a: number; b: number } | null>(null);
  function marcar(campo: "asunto" | "cuerpo", el: HTMLInputElement | HTMLTextAreaElement) {
    sel.current = { campo, a: el.selectionStart ?? 0, b: el.selectionEnd ?? 0 };
  }
  const cambiado = asunto !== inicial.asunto || cuerpo !== inicial.cuerpo;
  function insertar(ruta: string) {
    const campo = sel.current?.campo ?? "cuerpo";
    const texto = campo === "asunto" ? asunto : cuerpo;
    const [a, b] = sel.current ? [sel.current.a, sel.current.b] : [texto.length, texto.length];
    const nuevo = `${texto.slice(0, a)}{{${ruta}}}${texto.slice(b)}`;
    if (campo === "asunto") setAsunto(nuevo);
    else setCuerpo(nuevo);
  }
  async function publicar() {
    const r = await ejecutar<{ version: number | null }>("core.plantillas.update", {
      evento,
      canal,
      asunto,
      cuerpo,
    });
    if (r) avisar.exito(`Versión ${r.version ?? ""} publicada`);
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
      <form
        id={FORM_PLANTILLA}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void publicar();
        }}
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <p className="t-caption">{cambiado ? "Borrador · cambios sin publicar" : "Sin cambios"}</p>
        <Campo etiqueta="Asunto" htmlFor="p-asunto">
          <Input
            id="p-asunto"
            value={asunto}
            onSelect={(e) => marcar("asunto", e.currentTarget)}
            onChange={(e) => setAsunto(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Cuerpo" htmlFor="p-cuerpo">
          <Textarea
            id="p-cuerpo"
            rows={10}
            value={cuerpo}
            onSelect={(e) => marcar("cuerpo", e.currentTarget)}
            onChange={(e) => setCuerpo(e.target.value)}
          />
        </Campo>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-muted">Insertar variable</p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <Button
                key={v.ruta}
                variant="ghost"
                title={v.descripcion}
                onClick={() => insertar(v.ruta)}
                className="t-mono h-8 rounded-sm bg-accent-muted px-2 text-xs text-accent hover:bg-accent-muted hover:opacity-80"
              >
                {`{{${v.ruta}}}`}
              </Button>
            ))}
          </div>
        </div>
        {historial}
      </form>
      <VistaPrevia
        evento={evento}
        canal={canal}
        asunto={asunto}
        cuerpo={cuerpo}
        remitente={remitente}
      />
    </div>
  );
}
