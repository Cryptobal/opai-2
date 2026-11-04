"use client";

import { type FilaRcv, leerRcv } from "@opai/domain";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Checkbox, Input, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Vista = { nuevos: number; duplicados: number; errores: number; proveedoresCreados: number };

/** Importa el CSV del RCV descargado del SII: vista previa (nuevos, repetidos, con error) y luego aplica. */
export function HojaRcv({ puedeCrearProveedores }: { puedeCrearProveedores: boolean }) {
  const hoja = useHojaUrl("rcv");
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [filas, setFilas] = useState<FilaRcv[]>([]);
  const [malas, setMalas] = useState<string[]>([]);
  const [crear, setCrear] = useState(puedeCrearProveedores);
  const [vista, setVista] = useState<Vista | null>(null);
  const entrada = () => ({ documentos: filas.slice(0, 200), crearProveedores: crear });

  async function leer(f: File | undefined) {
    setVista(null);
    limpiarError();
    if (!f) return setFilas([]);
    const r = leerRcv(await f.text());
    setFilas(r.filas);
    setMalas(r.errores.slice(0, 5).map((e) => `Línea ${e.linea}: ${e.motivo}`));
  }
  async function previsualizar() {
    setVista(await ejecutar<Vista>("finanzas.compras.importar", entrada(), true));
  }
  async function importar() {
    const r = await ejecutar<Vista>("finanzas.compras.importar", entrada(), false, "layout", `rcv-${crypto.randomUUID()}`);
    if (!r) return;
    avisar.exito(`${r.nuevos} ${r.nuevos === 1 ? "documento importado" : "documentos importados"}`);
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Importar del RCV"
      descripcion="Sube el archivo CSV del Registro de Compras que descargas del SII. Verás qué entra antes de importar."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>Cancelar</Button>
          {vista ? (
            <Button disabled={pendiente || vista.nuevos === 0} onClick={() => void importar()}>
              {pendiente ? "Importando…" : `Importar ${vista.nuevos}`}
            </Button>
          ) : (
            <Button disabled={pendiente || filas.length === 0} onClick={() => void previsualizar()}>
              {pendiente ? "Calculando…" : "Ver vista previa"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Archivo CSV del RCV" htmlFor="rcv-csv" ayuda="Hasta 200 documentos por archivo. Los que ya están en el libro se omiten.">
          <Input id="rcv-csv" type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void leer(e.target.files?.[0])} />
        </Campo>
        {filas.length > 200 ? <Alerta tono="warning" titulo="El archivo trae más de 200 documentos: se importan los primeros 200." /> : null}
        {malas.length > 0 ? (
          <Alerta tono="warning" titulo="Algunas líneas no se pudieron leer">
            {malas.join(" · ")}
          </Alerta>
        ) : null}
        {puedeCrearProveedores ? (
          <Checkbox marcado={crear} onCambiar={(v) => { setCrear(v); setVista(null); }} etiqueta="Crear los proveedores que aún no existen" />
        ) : null}
        {vista ? (
          <p className="text-md">
            {vista.nuevos} nuevos · {vista.duplicados} ya estaban · {vista.errores} con error
            {vista.proveedoresCreados > 0 ? ` · ${vista.proveedoresCreados} proveedores por crear` : ""}
          </p>
        ) : filas.length > 0 ? (
          <p className="text-sm text-fg-muted">{filas.length} documentos leídos del archivo.</p>
        ) : null}
      </div>
    </Sheet>
  );
}
