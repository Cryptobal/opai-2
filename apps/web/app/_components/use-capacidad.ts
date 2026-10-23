"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Resultado } from "@opai/capabilities";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

/** Ejecuta capacidades desde la UI (acción de servidor) y refresca la página si escribió. */
export function useCapacidad(portal: string) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);

  async function ejecutar<T = unknown>(
    id: string,
    input: unknown,
    dryRun = false,
  ): Promise<T | null> {
    setError(null);
    setCodigo(null);
    const r: Resultado = await ejecutarCapacidad(portal, id, input, dryRun);
    if (!r.ok) {
      setError(r.error.message);
      setCodigo(r.error.code);
      return null;
    }
    if (!dryRun) iniciar(() => router.refresh());
    return r.data as T;
  }

  return { ejecutar, pendiente, error, codigo, limpiarError: () => setError(null) };
}
