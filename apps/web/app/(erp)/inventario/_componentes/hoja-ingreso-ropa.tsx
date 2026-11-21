"use client";

import { useState } from "react";

import { Alerta, avisar, Campo, Input, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { AccionesHoja } from "./acciones-hoja";

/** Ingreso de ropa (R15): unidades por talla y una nota opcional, como el número de la factura. */
export function HojaIngresoRopa({ tipoId, tallas }: { tipoId: string; tallas: string[] }) {
  const hoja = useHojaUrl("ingreso");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [nota, setNota] = useState("");
  const lineas = tallas
    .map((talla) => ({ talla, cantidad: Number(cantidades[talla] ?? "") }))
    .filter((l) => Number.isInteger(l.cantidad) && l.cantidad > 0);

  async function guardar() {
    const r = await ejecutar("inventario.ropa.ingresar", { tipoId, lineas, ...(nota.trim() ? { nota: nota.trim() } : {}) });
    if (!r) return;
    avisar.exito("Ingreso registrado");
    hoja.cerrar();
  }

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Registrar ingreso"
      acciones={
        <AccionesHoja onCancelar={hoja.cerrar} onGuardar={() => void guardar()} listo={lineas.length > 0} pendiente={pendiente} texto="Registrar" />
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <p className="t-caption">Escribe cuántas unidades llegaron de cada talla; deja en blanco las que no.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tallas.map((talla) => (
            <Campo key={talla} etiqueta={`Talla ${talla}`} htmlFor={`ir-${talla}`}>
              <Input
                id={`ir-${talla}`}
                inputMode="numeric"
                value={cantidades[talla] ?? ""}
                onChange={(e) => setCantidades((c) => ({ ...c, [talla]: e.target.value.replace(/\D/g, "") }))}
              />
            </Campo>
          ))}
        </div>
        <Campo etiqueta="Nota" htmlFor="ir-nota" ayuda="Opcional, por ejemplo el número de la factura.">
          <Input id="ir-nota" value={nota} onChange={(e) => setNota(e.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}
