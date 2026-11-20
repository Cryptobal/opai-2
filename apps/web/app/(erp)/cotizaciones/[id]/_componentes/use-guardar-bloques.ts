"use client";

import { useEffect, useRef } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { type BloqueArmador, cambiarBloque } from "@/lib/cpq-bloques-propuesta";

type Cambio = Parameters<typeof cambiarBloque>[2];

/**
 * Guarda el cambio de una sección sobre la última lista conocida y en orden: así dos campos que se guardan seguidos
 * no se pisan aunque la recarga del primero aún no llegue.
 */
export function useGuardarBloques(propuestaId: string, bloques: BloqueArmador[], onGuardado: () => void) {
  const { ejecutar, error } = useCapacidad("erp");
  const ultimo = useRef(bloques);
  const pendientes = useRef(0);
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    if (pendientes.current === 0) ultimo.current = bloques;
  }, [bloques]);

  function guardar(id: string, cambio: Cambio): Promise<boolean> {
    const lista = cambiarBloque(ultimo.current, id, cambio);
    ultimo.current = lista;
    pendientes.current += 1;
    const envio = cola.current.then(async () => {
      const r = await ejecutar("cpq.propuestas_tecnica.update", { id: propuestaId, bloques: lista }, false, "ninguna");
      pendientes.current -= 1;
      if (r) onGuardado();
      return !!r;
    });
    cola.current = envio;
    return envio;
  }
  return { guardar, error };
}
