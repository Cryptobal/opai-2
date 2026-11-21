"use client";

import Link from "next/link";

import { Alerta } from "@opai/ds";

import { CargarSugeridos } from "./diferidas";

/** Aviso cuando no hay ítems para entregar (CAR-745). */
export function AvisoSinEntregar({ parcial }: { parcial?: "activo" | "ropa" }) {
  if (!parcial) {
    return (
      <Alerta tono="info" titulo="Aún no hay nada para entregar">
        <div className="flex flex-col items-start gap-2 text-sm">
          <Link href="/inventario/tipos" className="font-medium underline">
            Tipos de inventario
          </Link>
          <CargarSugeridos />
        </div>
      </Alerta>
    );
  }
  return (
    <Alerta
      tono="info"
      titulo={parcial === "activo" ? "No hay activos disponibles" : "No hay ropa con existencias"}
    >
      <Link href="/inventario/tipos" className="text-sm font-medium underline">
        Revisa los tipos en Inventario
      </Link>
    </Alerta>
  );
}