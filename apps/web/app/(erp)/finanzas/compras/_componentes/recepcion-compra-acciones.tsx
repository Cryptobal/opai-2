"use client";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import { type Compra } from "../../_componentes/tipos";
import { HojaRecepcion } from "./diferidas";

/** Botón y hoja para acusar un documento pendiente ante el SII (CAR-644). */
export function RecepcionCompraAcciones({ compra }: { compra: Compra }) {
  if (compra.estadoRecepcion !== "pendiente_revision") return null;
  return (
    <>
      <EnlaceBotonHoja href="?recepcion=1">Aceptar o reclamar ante el SII</EnlaceBotonHoja>
      <HojaRecepcion compra={compra} />
    </>
  );
}