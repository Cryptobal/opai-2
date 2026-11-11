"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Select, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Resultado = { recibidos: number; nuevos: number; duplicados: number; omitidos: number; errores: number; proveedoresCreados: number };

/** Trae del Registro de Compras del SII (vía SimpleAPI) las compras de un mes; lo mismo que hace el trabajo automático (CAR-273). */
export function HojaSii({ periodos }: { periodos: { valor: string; etiqueta: string }[] }) {
  const hoja = useHojaUrl("sii");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [periodo, setPeriodo] = useState(periodos[0]?.valor ?? "");
  const [r, setR] = useState<Resultado | null>(null);

  async function sincronizar() {
    const [anio, mes] = periodo.split("-").map(Number);
    const res = await ejecutar<Resultado>("finanzas.compras.sincronizar_rcv", { anio, mes }, false, "layout", `sii-${crypto.randomUUID()}`);
    if (!res) return;
    setR(res);
    avisar.exito(res.nuevos === 1 ? "1 documento nuevo" : `${res.nuevos} documentos nuevos`);
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Sincronizar con el SII"
      descripcion="Trae las facturas y notas que el SII registra como recibidas en el mes y agrega al libro las que falten. Repetirlo no duplica nada."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>{r ? "Cerrar" : "Cancelar"}</Button>
          <Button disabled={pendiente || !periodo} onClick={() => void sincronizar()}>
            {pendiente ? "Consultando al SII…" : "Sincronizar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Mes" htmlFor="sii-periodo" ayuda="Cada consulta usa una de las 30 que SimpleAPI da al mes. La sincronización automática se ajusta en Configuración › Finanzas.">
          <Select id="sii-periodo" valor={periodo} onCambiar={(v) => { setPeriodo(v); setR(null); }} opciones={periodos} />
        </Campo>
        {r ? (
          <p className="text-md">
            {r.recibidos} en el SII · {r.nuevos} nuevos · {r.duplicados} ya estaban
            {r.omitidos > 0 ? ` · ${r.omitidos} omitidos` : ""}
            {r.errores > 0 ? ` · ${r.errores} con error` : ""}
            {r.proveedoresCreados > 0 ? ` · ${r.proveedoresCreados} proveedores creados` : ""}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
