import { formatearNumero } from "@opai/domain";
"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type FilaPreview = {
  indice: number;
  estado: "ok" | "error" | "omitida";
  mensaje: string | null;
  montoInterpretado?: number | null;
};

type VistaImport = {
  aplicadas: number;
  omitidas: number;
  errores: number;
  filas: FilaPreview[];
};

export function HojaImportar({
  abierta,
  onAbiertaChange,
  ocultarDisparador,
}: {
  abierta?: boolean;
  onAbiertaChange?: (v: boolean) => void;
  ocultarDisparador?: boolean;
}) {
  const [localAbierta, setLocalAbierta] = useState(false);
  const abierto = abierta ?? localAbierta;
  const setAbierto = onAbiertaChange ?? setLocalAbierta;
  const { ejecutar, pendiente, error, codigo, limpiarError } = useCapacidad("erp");
  const [texto, setTexto] = useState("");
  const [vista, setVista] = useState<VistaImport | null>(null);

  async function previsualizar() {
    limpiarError();
    const r = await ejecutar<VistaImport>(
      "finanzas.flujo.importar",
      { formato: "csv", contenido: texto },
      true,
    );
    setVista(r);
  }

  async function aplicar() {
    const r = await ejecutar<{ aplicadas: number }>("finanzas.flujo.importar", {
      formato: "csv",
      contenido: texto,
    });
    if (!r) return;
    avisar.exito(`Importadas ${r.aplicadas} filas`);
    setAbierto(false);
    setVista(null);
    setTexto("");
  }

  const errorServidor = codigo === "INTERNAL" || codigo === "UNPROCESSABLE";

  return (
    <>
      {ocultarDisparador ? null : (
        <Button variant="secondary" onClick={() => setAbierto(true)}>
          Importar CSV…
        </Button>
      )}
      <Sheet
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Importar planilla"
        descripcion="CSV con columnas seccion, etiqueta, semana, monto, nota, vinculo. Solo CSV en este PR."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            {vista ? (
              <Button disabled={pendiente || vista.aplicadas === 0} onClick={() => void aplicar()}>
                Importar
              </Button>
            ) : (
              <Button disabled={pendiente || !texto.trim()} onClick={() => void previsualizar()}>
                Vista previa
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? (
            <Alerta tono="danger" titulo={errorServidor ? "Error del servidor" : error}>
              {errorServidor ? (
                <Button variant="secondary" className="mt-2" onClick={() => void previsualizar()}>
                  Reintentar
                </Button>
              ) : null}
            </Alerta>
          ) : null}
          <Textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setVista(null);
            }}
            rows={12}
          />
          {vista ? (
            <>
              <Alerta
                tono="info"
                titulo={`${vista.aplicadas} aplicables · ${vista.omitidas} omitidas · ${vista.errores} errores`}
              />
              <ul className="max-h-48 overflow-auto text-sm text-fg-muted">
                {vista.filas.map((f) => (
                  <li key={f.indice} className="border-b border-border py-1">
                    Fila {f.indice + 2}: {f.estado}
                    {f.montoInterpretado != null ? ` · ${formatearNumero(f.montoInterpretado)} CLP` : ""}
                    {f.mensaje ? ` · ${f.mensaje}` : ""}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
