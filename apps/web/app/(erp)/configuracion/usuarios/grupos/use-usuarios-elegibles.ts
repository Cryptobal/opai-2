"use client";

import { useEffect, useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { UsuarioEmpresa } from "./tipos";

type FilaUsuario = UsuarioEmpresa & { portales: string[] };

/**
 * Usuarios elegibles para el selector de miembros (`core.users.list`): activos y con acceso al ERP,
 * la misma regla que valida `core.grupos.agregar_miembros`. Solo si gestiona; con su propio error,
 * para que un fallo no se lea como «no quedan usuarios por agregar».
 */
export function useUsuariosElegibles(gestiona: boolean) {
  const { ejecutar, error } = useCapacidad("erp");
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);

  useEffect(() => {
    if (!gestiona) return;
    void ejecutar<FilaUsuario[]>("core.users.list", {}, false, "ninguna").then((u) => {
      if (!u) return;
      const elegibles = u.filter((x) => x.estado === "activa" && x.portales.includes("erp"));
      setUsuarios(
        elegibles.map(({ userId, nombre, email, estado }) => ({ userId, nombre, email, estado })),
      );
    });
  }, [ejecutar, gestiona]);

  return { usuarios, errorUsuarios: error };
}
