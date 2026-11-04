"use client";

import { useState } from "react";

import type { OpcionesVincular, Vinculo } from "./campo-vincular";
import { CAPA_DE_ENTIDAD, type EntidadDocumento, type TipoDocumento } from "./tipos";

/**
 * Destino de la subida y tipos que se ofrecen. En una ficha es la entidad fija; en el explorador
 * (`vincular`) lo elige la persona, y se ofrecen solo los tipos de la capa de esa entidad.
 */
export function useDestino(
  entidad: EntidadDocumento,
  tipos: TipoDocumento[],
  vincular: OpcionesVincular | undefined,
) {
  const [vinculo, setVinculo] = useState<Vinculo>({
    tipo: entidad.tipo === "puesto" ? "tenant" : entidad.tipo,
    id: entidad.id,
    nombre: null,
  });
  const visibles = vincular ? tipos.filter((t) => t.capa === CAPA_DE_ENTIDAD[vinculo.tipo]) : tipos;
  const destino: EntidadDocumento | null = !vincular
    ? entidad
    : vinculo.id
      ? { tipo: vinculo.tipo, id: vinculo.id }
      : null;
  return { vinculo, setVinculo, visibles, destino };
}
