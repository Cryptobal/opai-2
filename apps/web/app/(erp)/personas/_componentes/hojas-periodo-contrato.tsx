"use client";
import { HojaAnularPeriodo } from "./hoja-anular-periodo";
import { HojaRegistrarPeriodo } from "./hoja-contrato-periodo";

/** Hojas de los períodos del contrato (CAR-409): registrar y, si hay períodos, anular el último. */
export function HojasPeriodoContrato(props: {
  personaId: string;
  inicioSugerido: string;
  soloIndefinido: boolean;
  ultimo: { id: string; descripcion: string } | null;
}) {
  return (
    <>
      <HojaRegistrarPeriodo
        personaId={props.personaId}
        inicioSugerido={props.inicioSugerido}
        soloIndefinido={props.soloIndefinido}
      />
      {props.ultimo ? (
        <HojaAnularPeriodo
          personaId={props.personaId}
          periodoId={props.ultimo.id}
          descripcion={props.ultimo.descripcion}
        />
      ) : null}
    </>
  );
}
