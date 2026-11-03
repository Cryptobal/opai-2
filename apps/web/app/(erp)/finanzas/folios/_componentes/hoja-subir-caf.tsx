"use client";

import { useMemo, useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { leerCafXml } from "./leer-caf";
import type { VistaPreviaCaf } from "./tipos";
import { VistaPreviaCafUi } from "./vista-previa-caf";

export function HojaSubirCaf({
  abierta,
  onAbiertaChange,
}: {
  abierta: boolean;
  onAbiertaChange: (v: boolean) => void;
}) {
  const { ejecutar, pendiente, error, codigo, limpiarError } = useCapacidad("erp");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<VistaPreviaCaf | null>(null);
  const idempotencyKey = useMemo(
    () => (archivo ? `caf-${archivo.name}-${archivo.lastModified}-${archivo.size}` : ""),
    [archivo],
  );

  async function previsualizar() {
    if (!archivo || !idempotencyKey) return;
    limpiarError();
    setVista(null);
    const cafXml = await leerCafXml(archivo);
    const r = await ejecutar<VistaPreviaCaf>("finanzas.folios.cargar_caf", { cafXml }, true);
    if (r) setVista(r);
  }

  async function confirmar() {
    if (!archivo || !idempotencyKey) return;
    const cafXml = await leerCafXml(archivo);
    const r = await ejecutar<VistaPreviaCaf>(
      "finanzas.folios.cargar_caf",
      { cafXml },
      false,
      "layout",
      idempotencyKey,
    );
    if (!r) return;
    avisar.exito("CAF cargado correctamente");
    onAbiertaChange(false);
    setVista(null);
    setArchivo(null);
  }

  const errorServidor = codigo === "INTERNAL" || codigo === "UNPROCESSABLE";

  return (
    <Sheet
      abierto={abierta}
      onCerrar={() => {
        onAbiertaChange(false);
        setVista(null);
        setArchivo(null);
        limpiarError();
      }}
      titulo="Subir CAF"
      descripcion="Archivo XML emitido por el SII. Revisamos tipo, rango, RUT y vencimiento antes de guardar."
      acciones={
        <>
          <Button variant="secondary" onClick={() => onAbiertaChange(false)}>
            Cancelar
          </Button>
          {vista ? (
            <Button disabled={pendiente} onClick={() => void confirmar()}>
              Cargar
            </Button>
          ) : (
            <Button disabled={pendiente || !archivo} onClick={() => void previsualizar()}>
              Vista previa
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <Alerta tono="danger" titulo={errorServidor ? "No pudimos completar la acción. Reintenta; si sigue igual, avisa a un administrador." : "No se pudo cargar el CAF"}>
            {error}
            {errorServidor ? (
              <Button variant="secondary" className="mt-2" onClick={() => void previsualizar()}>
                Reintentar
              </Button>
            ) : null}
          </Alerta>
        ) : null}
        {!vista ? (
          <Campo etiqueta="Archivo XML del CAF" htmlFor="caf-xml" ayuda="Solo .xml · máximo 500 KB · no se muestra el contenido.">
            <Input
              id="caf-xml"
              type="file"
              accept=".xml,application/xml,text/xml"
              className="t-body-sm file:mr-2 file:rounded file:border-0 file:bg-surface-muted file:px-2 file:py-1"
              onChange={(e) => {
                setArchivo(e.target.files?.[0] ?? null);
                setVista(null);
                limpiarError();
              }}
            />
          </Campo>
        ) : (
          <VistaPreviaCafUi vista={vista} />
        )}
      </div>
    </Sheet>
  );
}
