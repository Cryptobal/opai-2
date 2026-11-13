"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Menu } from "@opai/ds";

import { type AccionNegocios, ETIQUETA_ACCION } from "./acciones-negocios-tipos";

/**
 * Menú «⋯» de Negocios en el teléfono (CAR-371). «Exportar a Excel» es una descarga: navega por
 * documento, no por el router. El ícono del disparador llega ya pintado desde el servidor.
 */
export function MenuAccionesNegocios(p: {
  acciones: readonly AccionNegocios[];
  disparador: ReactNode;
}) {
  const router = useRouter();
  return (
    <Menu
      className="md:hidden"
      etiqueta="Más acciones de negocios"
      disparador={p.disparador}
      items={p.acciones.map((a) => ({
        id: a.id,
        etiqueta: ETIQUETA_ACCION[a.id],
        onSelect: () =>
          a.id === "exportar" ? window.location.assign(a.href) : router.push(a.href),
      }))}
    />
  );
}
