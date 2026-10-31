"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Checkbox, Campo, Select, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

import { type Centro, claveCentro, type Compra, NOMBRE_DTE, refDe } from "../../_componentes/tipos";

type Vista = { aplican: string[]; sinCambio: string[]; conOtroCentro: string[]; centroCostoNombre: string };

/** Asigna un centro de costo a varios documentos a la vez, con vista previa antes de aplicar. */
export function HojaLote({ centros, documentos }: { centros: Centro[]; documentos: Compra[] }) {
  const hoja = useHojaUrl("lote");
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set(documentos.map((d) => d.id)));
  const [centro, setCentro] = useState("");
  const [vista, setVista] = useState<Vista | null>(null);
  const destino = centros.find((c) => claveCentro(c) === centro);
  const entrada = () => ({ documentoIds: [...elegidos], centro: refDe(destino as Centro) });

  function cambiarCentro(v: string) {
    setCentro(v);
    setVista(null);
    limpiarError();
  }
  async function previsualizar() {
    setVista(await ejecutar<Vista>("finanzas.compras.asignar_centro", entrada(), true));
  }
  async function aplicar() {
    const r = await ejecutar<Vista>("finanzas.compras.asignar_centro", entrada());
    if (!r) return;
    avisar.exito(`Centro de costo asignado a ${r.aplican.length} ${r.aplican.length === 1 ? "documento" : "documentos"}`);
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Asignar centro de costo"
      descripcion="Elige los documentos y el centro. Verás qué cambia antes de aplicar."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>Cancelar</Button>
          {vista ? (
            <Button disabled={pendiente || vista.aplican.length === 0} onClick={() => void aplicar()}>
              {pendiente ? "Aplicando…" : `Aplicar a ${vista.aplican.length}`}
            </Button>
          ) : (
            <Button disabled={pendiente || !destino || elegidos.size === 0} onClick={() => void previsualizar()}>
              {pendiente ? "Calculando…" : "Ver vista previa"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Centro de costo" htmlFor="lo-centro">
          <Select
            id="lo-centro"
            valor={centro}
            onCambiar={cambiarCentro}
            placeholder="Elige el centro"
            opciones={centros.map((c) => ({ valor: claveCentro(c), etiqueta: c.nombre }))}
          />
        </Campo>
        {vista ? (
          <Alerta tono="info" titulo={`Se asignará «${vista.centroCostoNombre}» a ${vista.aplican.length}`}>
            {vista.sinCambio.length ? `${vista.sinCambio.length} ya lo tienen. ` : ""}
            {vista.conOtroCentro.length ? `${vista.conOtroCentro.length} tienen otro centro y no se tocan.` : ""}
          </Alerta>
        ) : null}
        <ul className="flex flex-col">
          {documentos.map((d) => (
            <li key={d.id} className="border-b border-border last:border-b-0">
              <Checkbox
                marcado={elegidos.has(d.id)}
                onCambiar={(m) => {
                  const s = new Set(elegidos);
                  if (m) s.add(d.id);
                  else s.delete(d.id);
                  setElegidos(s);
                  setVista(null);
                }}
                etiqueta={`${d.proveedorNombre} · ${NOMBRE_DTE[d.tipoDte]} ${d.folio}`}
                descripcion={pesos(d.montoTotal)}
              />
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
