"use client";

import { useEffect, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Miembro = { userId: string; nombre: string; estado: string };

/** Miembros activos de la empresa para elegir responsable; sin permiso de usuarios queda vacío. */
export function useMiembros(activo: boolean) {
  const [opciones, setOpciones] = useState<{ valor: string; etiqueta: string }[]>([]);
  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    void ejecutarCapacidad("erp", "core.users.list", {}).then((r) => {
      if (!vigente || !r.ok) return;
      setOpciones(
        (r.data as Miembro[])
          .filter((m) => m.estado === "activa")
          .map((m) => ({ valor: m.userId, etiqueta: m.nombre })),
      );
    });
    return () => {
      vigente = false;
    };
  }, [activo]);
  return opciones;
}
