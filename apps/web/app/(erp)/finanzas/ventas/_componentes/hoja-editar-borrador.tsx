"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Dialog, Input } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { hoyIso } from "@/lib/fechas";

import { EmitirFechaEmision } from "../nuevo/emitir-fecha";
import { EmitirLineasDetalle } from "../nuevo/emitir-lineas";
import { type LineaForm, montoDeLinea, parseMonto } from "../nuevo/emitir-util";
import { descuentoTexto, parseDescuento } from "../programacion/_componentes/tipos";
import type { DatosBorrador, LineaBorrador, Venta } from "./tipos";

type Borrador = Venta & DatosBorrador & { fechaVencimiento?: string | null };

const aForm = (l: LineaBorrador): LineaForm => ({
  glosa: l.glosa,
  cantidad: l.cantidad ?? "1",
  precio: String(l.precioUnitario ?? l.monto),
  descuento: l.descuentoPct ? descuentoTexto(l.descuentoPct) : "0",
});
const DIA = 86_400_000;
const plazoDe = (v: Borrador) =>
  v.fechaEmision && v.fechaVencimiento
    ? String(Math.max(0, Math.round((Date.parse(v.fechaVencimiento) - Date.parse(v.fechaEmision)) / DIA)))
    : "30";

/**
 * Edita un borrador sin folio (CAR-248): líneas, fecha, plazo y glosa o motivo. El cliente y el tipo no se cambian: para eso
 * se descarta y se crea otro. Las referencias de una factura se conservan tal cual.
 */
export function HojaEditarBorrador({ venta, onCerrar }: { venta: Borrador; onCerrar: () => void }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const esNd = venta.tipoDte === 56;
  const hoy = hoyIso();
  const [fecha, setFecha] = useState(venta.fechaEmision ?? hoy);
  const [plazo, setPlazo] = useState(plazoDe(venta));
  const [texto, setTexto] = useState(venta.glosa ?? "");
  const [lineas, setLineas] = useState<LineaForm[]>((venta.lineas ?? []).map(aForm));
  const plazoN = Number(plazo);
  const lineasOk = lineas.length > 0 && lineas.every((l) => l.glosa.trim() && montoDeLinea(l) != null && parseDescuento(l.descuento) != null);
  const textoOk = !esNd || texto.trim().length >= 3;
  const listo = lineasOk && textoOk && fecha !== "" && fecha <= hoy && Number.isInteger(plazoN) && plazoN >= 0 && plazoN <= 365;
  const exenta = venta.tipoDte === 34 || (venta.montoIva ?? 0) === 0;

  async function guardar() {
    const r = await ejecutar("finanzas.ventas.actualizar_borrador", {
      documentoId: venta.id,
      fechaEmision: fecha,
      plazoPagoDias: plazoN,
      ...(esNd ? { motivo: texto.trim() } : { glosa: texto.trim() || null }),
      lineas: lineas.map((l) => {
        const d = parseDescuento(l.descuento);
        return {
          glosa: l.glosa.trim(),
          monto: montoDeLinea(l)!,
          cantidad: l.cantidad.trim(),
          precioUnitario: parseMonto(l.precio)!,
          ...(d ? { descuentoPct: d } : {}),
        };
      }),
    });
    if (!r) return;
    avisar.exito("Borrador actualizado");
    onCerrar();
  }

  return (
    <Dialog
      abierto
      onCerrar={onCerrar}
      titulo={esNd ? "Editar nota de débito" : "Editar borrador"}
      tamano="grande"
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={pendiente || !listo} onClick={() => void guardar()}>Guardar cambios</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo="No se pudo guardar">{error}</Alerta> : null}
        <EmitirFechaEmision valor={fecha} onCambiar={setFecha} hoyIso={hoy} disabled={false} />
        <Campo etiqueta="Plazo de pago (días)" htmlFor="edit-plazo" {...(plazo !== "" && !listo && !(plazoN >= 0 && plazoN <= 365) ? { error: "Entre 0 y 365 días." } : {})}>
          <Input id="edit-plazo" inputMode="numeric" value={plazo} onChange={(e) => setPlazo(e.target.value)} />
        </Campo>
        <Campo etiqueta={esNd ? "Motivo" : "Glosa (opcional)"} htmlFor="edit-texto">
          <Input id="edit-texto" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Campo>
        <EmitirLineasDetalle documentoId={null} tipoDte={exenta ? "34" : "33"} lineas={lineas} setLineas={setLineas} />
      </div>
    </Dialog>
  );
}
