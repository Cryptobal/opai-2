"use client";

import { useMemo, useState } from "react";

import { Alerta, avisar, Button, Campo, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { CuentaBanco } from "./datos";

type VistaCartola = {
  aplicados: number;
  duplicados: number;
  rechazados: number;
  saldoFinal: number | null;
  filas: {
    indice: number;
    estado: string;
    motivo: string | null;
    monto: number | null;
    glosa: string | null;
  }[];
};

function archivoABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      resolve(data.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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
  const [vista, setVista] = useState<VistaCartola | null>(null);
  const idempotencyKey = useMemo(
    () => (archivo ? `${archivo.name}-${archivo.lastModified}-${archivo.size}` : ""),
    [archivo],
  );

  async function previsualizar() {
    if (!archivo || !cuenta || !idempotencyKey) return;
    limpiarError();
    const contenidoBase64 = await archivoABase64(archivo);
    const fmt = formato === "santander" ? "santander" : "generico";
    const r = await ejecutar<VistaCartola>(
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
          <input
            id="cartola-archivo"
            type="file"
            accept={formato === "santander" ? ".xlsx,.xls" : ".csv,.txt"}
            className="t-body-sm w-full"
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              setVista(null);
            }}
          />
        </Campo>
        {vista ? (
          <>
            <Alerta
              tono="info"
              titulo={`${vista.aplicados} nuevos · ${vista.duplicados} duplicados · ${vista.rechazados} rechazados`}
            />
            <ul className="max-h-48 overflow-auto text-sm text-fg-muted">
              {vista.filas.slice(0, 40).map((f) => (
                <li key={f.indice} className="border-b border-border py-1">
                  Fila {f.indice + 1}: {f.estado}
                  {f.monto != null ? ` · ${f.monto.toLocaleString("es-CL")} CLP` : ""}
                  {f.glosa ? ` · ${f.glosa}` : ""}
                  {f.motivo ? ` · ${f.motivo}` : ""}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
