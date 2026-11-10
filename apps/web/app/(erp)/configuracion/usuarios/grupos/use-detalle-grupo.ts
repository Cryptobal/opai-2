"use client";

import { useCallback, useEffect, useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { GrupoDetalle, UsuarioEmpresa } from "./tipos";

/**
 * Detalle de un grupo (`core.grupos.get`) y, si gestiona, los usuarios de la empresa para el selector
 * (`core.users.list`). Se cargan al abrir la hoja, no con la lista: la pestaña no paga el directorio.
 */
export function useDetalleGrupo(id: string, gestiona: boolean) {
  const { ejecutar, error } = useCapacidad("erp");
  const [detalle, setDetalle] = useState<GrupoDetalle | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);

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
    if (!gestiona) return;
    void ejecutar<UsuarioEmpresa[]>("core.users.list", {}, false, "ninguna").then((u) => {
      if (u)
        setUsuarios(
          u.map(({ userId, nombre, email, estado }) => ({ userId, nombre, email, estado })),
        );
    });
  }, [ejecutar, gestiona, leer]);

  return { detalle, usuarios, error, recargar };
}
