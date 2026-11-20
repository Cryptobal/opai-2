"use client";

import { Button, Empty } from "@opai/ds";

import type { FiltroNovedades } from "./encabezado-novedades";
import { MODULO_TODOS } from "./filtro-novedades";

export function VacioFiltroNovedades({
  filtro,
  modulo,
  onVerTodas,
}: {
  filtro: FiltroNovedades;
  modulo: string;
  onVerTodas: () => void;
}) {
  const filtroActivo = filtro === "no_leidas" || modulo !== MODULO_TODOS;
  return (
    <Empty
      titulo={filtro === "no_leidas" ? "No tienes novedades sin leer" : "No hay novedades en este módulo"}
      descripcion={
        filtroActivo ? "Prueba otro módulo o vuelve a «Todas»." : "Las que ya leíste siguen en «Todas»."
      }
      accion={
        <Button variant="secondary" onClick={onVerTodas}>
          Ver todas
        </Button>
      }
    />
  );
}