"use client";

import { useState } from "react";

import type { OpcionesVincular, Vinculo } from "./campo-vincular";
import { CAPA_DE_ENTIDAD, type EntidadDocumento, type TipoDocumento } from "./tipos";

/** Vínculo de partida: la entidad fija de la ficha o, en el explorador, la empresa. */
export function vinculoInicial(entidad: EntidadDocumento): Vinculo {
  return {
    tipo: entidad.tipo === "puesto" ? "tenant" : entidad.tipo,
    id: entidad.id,
    nombre: null,
  };
}

/**
 * Destino de la subida y tipos que se ofrecen. En una ficha es la entidad fija; en el explorador
 * (`vincular`) lo elige la persona, y se ofrecen solo los tipos de la capa de esa entidad.
 */
export function useDestino(
  entidad: EntidadDocumento,
  tipos: TipoDocumento[],
  vincular: OpcionesVincular | undefined,
) {
  const [vinculo, setVinculo] = useState<Vinculo>(() => vinculoInicial(entidad));
  const visibles = vincular ? tipos.filter((t) => t.capa === CAPA_DE_ENTIDAD[vinculo.tipo]) : tipos;
  const destino: EntidadDocumento | null = !vincular
    ? entidad
    : vinculo.id
      ? { tipo: vinculo.tipo, id: vinculo.id }
      : null;
  /** Al cerrar la hoja: la próxima subida parte de nuevo desde la entidad por defecto. */
  const reiniciar = () => setVinculo(vinculoInicial(entidad));
  return { vinculo, setVinculo, reiniciar, visibles, destino };
}
