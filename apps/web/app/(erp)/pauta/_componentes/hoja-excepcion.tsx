"use client";

import { useHojaUrl } from "@/app/_components/maestros/use-url";

import { HojaExcepcionFormulario } from "./hoja-excepcion-formulario";
import type { MesPauta } from "./tipos";

/** P03: un día de un puesto. Excepciones (mensual) y acciones diarias cuando `diaria`. */
export function HojaExcepcion({
  mes,
  puedeEditar,
  diaria,
}: {
  mes: MesPauta;
  puedeEditar: boolean;
  diaria?: boolean;
}) {
  const hoja = useHojaUrl("dia");
  if (!hoja.abierta || !hoja.valor) return null;
  const [puestoId, fecha] = hoja.valor.split("_");
  const puesto = mes.puestos.find((p) => p.id === puestoId);
  const celda = puesto?.celdas.find((c) => c.fecha === fecha);
  if (!puesto || !celda || !fecha) return null;
  return (
    <HojaExcepcionFormulario
      key={hoja.valor}
      mes={mes}
      puestoId={puesto.id}
      puestoNombre={puesto.nombre}
      horario={puesto.horario}
      fecha={fecha}
      celda={celda}
      puedeEditar={puedeEditar}
      diaria={diaria ?? false}
      onCerrar={hoja.cerrar}
    />
  );
}
