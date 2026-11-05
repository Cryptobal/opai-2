"use client";

import { useEffect, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import type { Modelo } from "./tipos";

/** Modelos de IA conectados a la empresa (`agente.modelos.list`); se piden al abrir el panel. */
export function useModelos(portal: string, abierto: boolean) {
  const [modelos, setModelos] = useState<Modelo[] | null>(null);
  const [errorModelos, setErrorModelos] = useState(false);
  const [modelo, setModelo] = useState<Modelo | null>(null);
  useEffect(() => {
    if (!abierto || modelos !== null) return;
    let vivo = true;
    void ejecutarCapacidad(portal, "agente.modelos.list", {}).then((r) => {
      if (!vivo) return;
      if (!r.ok) return setErrorModelos(true);
      const lista = r.data as Modelo[];
      setModelos(lista);
      setModelo((m) => m ?? lista[0] ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [abierto, modelos, portal]);
  return { modelos, errorModelos, modelo, setModelo };
}
