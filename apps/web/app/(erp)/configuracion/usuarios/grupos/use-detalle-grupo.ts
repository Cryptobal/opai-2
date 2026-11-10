"use client";

import { useCallback, useEffect, useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { GrupoDetalle } from "./tipos";
import { useUsuariosElegibles } from "./use-usuarios-elegibles";

/**
 * Detalle de un grupo (`core.grupos.get`) y, si gestiona, los usuarios elegibles para el selector.
 * Se cargan al abrir la hoja, no con la lista: la pestaña no paga el directorio.
 */
export function useDetalleGrupo(id: string, gestiona: boolean) {
  const { ejecutar, error } = useCapacidad("erp");
  const { usuarios, errorUsuarios } = useUsuariosElegibles(gestiona);
  const [detalle, setDetalle] = useState<GrupoDetalle | null>(null);

  const leer = useCallback(
    () => ejecutar<GrupoDetalle>("core.grupos.get", { id }, false, "ninguna"),
    [ejecutar, id],
  );
  const recargar = useCallback(async () => {
    const d = await leer();
    if (d) setDetalle(d);
  }, [leer]);

  useEffect(() => {
    void leer().then((d) => {
      if (d) setDetalle(d);
    });
  }, [leer]);

  return { detalle, usuarios, error, errorUsuarios, recargar };
}
