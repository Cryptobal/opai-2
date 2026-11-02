"use client";

import { useMemo, useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { archivoABase64 } from "./cartola-archivo";
import type { CuentaBanco } from "./bancos-tipos";
import type { VistaCartolaPreview } from "./tipos-cartola";
import { VistaCartolaPreview as VistaCartolaPreviewUi } from "./vista-cartola-preview";

export function HojaSubirCartola({
  cuentas,
  cuentaId,
  abierta,
  onAbiertaChange,
}: {
  cuentas: CuentaBanco[];
  cuentaId: string | null;
  abierta: boolean;
  onAbiertaChange: (v: boolean) => void;
}) {
  const { ejecutar, pendiente, error, codigo, limpiarError } = useCapacidad("erp");
  const [cuenta, setCuenta] = useState(cuentaId ?? cuentas[0]?.id ?? "");
  const [formato, setFormato] = useState<"santander" | "generico">("santander");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<VistaCartolaPreview | null>(null);
  const idempotencyKey = useMemo(
    () => (archivo ? `${archivo.name}-${archivo.lastModified}-${archivo.size}` : ""),
    [archivo],
  );

  async function previsualizar() {
    if (!archivo || !cuenta || !idempotencyKey) return;
    limpiarError();
    const contenidoBase64 = await archivoABase64(archivo);
    const fmt = formato === "santander" ? "santander" : "generico";
    const r = await ejecutar<VistaCartolaPreview>(
      "finanzas.cartolas.importar",
      { cuentaId: cuenta, formato: fmt, contenidoBase64, nombreArchivo: archivo.name, idempotencyKey },
      true,
    );
    setVista(r);
  }

  async function confirmar() {
    if (!archivo || !cuenta || !idempotencyKey) return;
    const contenidoBase64 = await archivoABase64(archivo);
    const fmt = formato === "santander" ? "santander" : "generico";
    const r = await ejecutar<{ aplicados: number }>(
      "finanzas.cartolas.importar",
      { cuentaId: cuenta, formato: fmt, contenidoBase64, nombreArchivo: archivo.name, idempotencyKey },
      false,
      "layout",
      idempotencyKey,
    );
    if (!r) return;
    avisar.exito(`Importados ${r.aplicados} movimientos`);
    onAbiertaChange(false);
    setVista(null);
    setArchivo(null);
  }

  const errorServidor = codigo === "INTERNAL" || codigo === "UNPROCESSABLE";

  return (
    <Sheet
      abierto={abierta}
      onCerrar={() => onAbiertaChange(false)}
      titulo="Subir cartola"
      descripcion="Cartola Santander (XLSX) o CSV genérico con mapeo guardado en la cuenta."
      acciones={
        <>
          <Button variant="secondary" onClick={() => onAbiertaChange(false)}>
            Cancelar
          </Button>
          {vista ? (
            <Button disabled={pendiente || vista.aplicados === 0} onClick={() => void confirmar()}>
              Importar
            </Button>
          ) : (
            <Button disabled={pendiente || !archivo || !cuenta} onClick={() => void previsualizar()}>
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
        {cuentas.length > 1 ? (
          <Campo etiqueta="Cuenta" htmlFor="cartola-cuenta">
            <Select
              id="cartola-cuenta"
              valor={cuenta}
              onCambiar={setCuenta}
              opciones={cuentas.map((c) => ({
                valor: c.id,
                etiqueta: `${c.banco} · ${c.numeroVisible}`,
              }))}
            />
          </Campo>
        ) : null}
        <Campo etiqueta="Formato" htmlFor="cartola-formato">
          <Select
            id="cartola-formato"
            valor={formato}
            onCambiar={(v) => setFormato(v as "santander" | "generico")}
            opciones={[
              { valor: "santander", etiqueta: "Santander (XLSX)" },
              { valor: "generico", etiqueta: "CSV genérico" },
            ]}
          />
        </Campo>
        <Campo etiqueta="Archivo" htmlFor="cartola-archivo">
          <Input
            id="cartola-archivo"
            type="file"
            accept={formato === "santander" ? ".xlsx,.xls" : ".csv,.txt"}
            className="t-body-sm file:mr-2 file:rounded file:border-0 file:bg-surface-muted file:px-2 file:py-1"
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              setVista(null);
            }}
          />
        </Campo>
        {vista ? (
          <VistaCartolaPreviewUi
            aplicados={vista.aplicados}
            duplicados={vista.duplicados}
            rechazados={vista.rechazados}
            filas={vista.filas}
          />
        ) : null}
      </div>
    </Sheet>
  );
}
