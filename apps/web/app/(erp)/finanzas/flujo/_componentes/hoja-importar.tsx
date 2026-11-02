"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export function HojaImportar() {
  const [abierta, setAbierta] = useState(false);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [texto, setTexto] = useState("");
  const [vista, setVista] = useState<{ aplicadas: number; omitidas: number; errores: number } | null>(
    null,
  );

  async function previsualizar() {
    setVista(
      await ejecutar("finanzas.flujo.importar", { formato: "csv", contenido: texto }, true),
    );
  }

  async function aplicar() {
    const r = await ejecutar("finanzas.flujo.importar", { formato: "csv", contenido: texto });
    if (!r) return;
    avisar.exito(`Importadas ${(r as { aplicadas: number }).aplicadas} filas`);
    setAbierta(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setAbierta(true)}>
        Importar CSV…
      </Button>
      <Sheet
        abierto={abierta}
        onCerrar={() => setAbierta(false)}
        titulo="Importar planilla"
        descripcion="CSV con columnas seccion, etiqueta, semana, monto, nota, vinculo. XLSX: TODO(decisión Carlos)."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierta(false)}>Cancelar</Button>
            {vista ? (
              <Button disabled={pendiente} onClick={() => void aplicar()}>Importar</Button>
            ) : (
              <Button disabled={pendiente || !texto.trim()} onClick={() => void previsualizar()}>
                Vista previa
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <Textarea value={texto} onChange={(e) => { setTexto(e.target.value); setVista(null); }} rows={12} />
          {vista ? (
            <Alerta tono="info" titulo={`${vista.aplicadas} aplicables · ${vista.omitidas} omitidas · ${vista.errores} errores`} />
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
