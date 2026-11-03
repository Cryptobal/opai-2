import { formatearClp } from "@opai/domain";
"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, InputFecha, Select, Sheet } from "@opai/ds";

import { InputPesos } from "@/app/_components/maestros/input-pesos";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { hoyIso } from "@/lib/fechas";

import {
  type Centro,
  claveCentro,
  type Compra,
  NOMBRE_DTE,
  type Proveedor,
  refDe,
} from "../../_componentes/tipos";

const TIPOS = [33, 34, 56, 61].map((t) => ({ valor: String(t), etiqueta: NOMBRE_DTE[t] ?? String(t) }));
const IVA = 0.19;
const num = (d: string) => (d ? Number(d) : 0);

/** Registrar a mano un documento recibido (factura, exenta, nota de débito o de crédito). */
export function HojaCompra({ proveedores, centros }: { proveedores: Proveedor[]; centros: Centro[] }) {
  const hoja = useHojaUrl("nuevo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [proveedorId, setProveedorId] = useState("");
  const [tipo, setTipo] = useState("33");
  const [folio, setFolio] = useState("");
  const [emision, setEmision] = useState(hoyIso());
  const [neto, setNeto] = useState("");
  const [exento, setExento] = useState("");
  const [iva, setIva] = useState("");
  const [centro, setCentro] = useState("");
  const total = num(neto) + num(exento) + num(iva);
  const centroElegido = centros.find((c) => claveCentro(c) === centro);

  async function guardar() {
    const r = await ejecutar<Compra>("finanzas.compras.registrar", {
      proveedorId,
      tipoDte: Number(tipo),
      folio: Number(folio),
      fechaEmision: emision,
      montoNeto: num(neto),
      montoExento: num(exento),
      montoIva: num(iva),
      ...(centroElegido ? { centro: refDe(centroElegido) } : {}),
    });
    if (!r) return;
    avisar.exito("Documento registrado");
    hoja.cerrar();
  }
  const valido = proveedorId && Number(folio) > 0 && emision && total > 0;
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Registrar documento"
      descripcion="Un documento recibido de un proveedor. El total se calcula con los montos."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>Cancelar</Button>
          <Button disabled={pendiente || !valido} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Registrar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Proveedor" htmlFor="co-prov">
          <Select
            id="co-prov"
            valor={proveedorId}
            onCambiar={setProveedorId}
            placeholder="Elige un proveedor"
            opciones={proveedores.map((p) => ({ valor: p.id, etiqueta: p.razonSocial }))}
          />
        </Campo>
        <Campo etiqueta="Tipo de documento" htmlFor="co-tipo">
          <Select id="co-tipo" valor={tipo} onCambiar={setTipo} opciones={TIPOS} />
        </Campo>
        <Campo etiqueta="Folio" htmlFor="co-folio">
          <Input id="co-folio" inputMode="numeric" value={folio} onChange={(e) => setFolio(e.target.value.replace(/\D/g, ""))} />
        </Campo>
        <Campo etiqueta="Fecha de emisión" htmlFor="co-emision">
          <InputFecha id="co-emision" valor={emision} onCambiar={setEmision} />
        </Campo>
        <Campo etiqueta="Neto" htmlFor="co-neto">
          <InputPesos
            id="co-neto"
            valor={neto}
            onCambiar={(v) => {
              setNeto(v);
              setIva(v ? String(Math.round(Number(v) * IVA)) : "");
            }}
          />
        </Campo>
        <Campo etiqueta="IVA" htmlFor="co-iva" ayuda="Se calcula al 19 % del neto; edítalo si el documento es distinto.">
          <InputPesos id="co-iva" valor={iva} onCambiar={setIva} />
        </Campo>
        <Campo etiqueta="Exento" htmlFor="co-exento">
          <InputPesos id="co-exento" valor={exento} onCambiar={setExento} />
        </Campo>
        <p className="t-numeric text-md font-medium">Total {formatearClp(total)}</p>
        <Campo etiqueta="Centro de costo" htmlFor="co-centro" ayuda="Opcional: si lo dejas vacío queda «sin centro de costo» con una sugerencia.">
          <Select
            id="co-centro"
            valor={centro}
            onCambiar={setCentro}
            placeholder="Sin centro por ahora"
            opciones={centros.map((c) => ({ valor: claveCentro(c), etiqueta: c.nombre }))}
          />
        </Campo>
      </div>
    </Sheet>
  );
}
