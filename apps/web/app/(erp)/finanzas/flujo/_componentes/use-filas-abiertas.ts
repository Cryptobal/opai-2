"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { escribirCambios, leerCambios, leerTexto, suscribir } from "./almacen-filas-abiertas";
import { abiertaPorDefecto } from "./estructura";

const recien = new Map<string, number>();

/**
 * Qué secciones, grupos y clientes de la planilla están abiertos, recordado por persona y empresa (`epoca`)
 * en el navegador: no se guarda en el servidor. Sin lo guardado rige `abiertaPorDefecto`.
 */

export function useFilasAbiertas(epoca: string) {
  const texto = useSyncExternalStore(suscribir, () => leerTexto(epoca), () => "");
  const cambios = useMemo(() => leerCambios(texto), [texto]);
  const abierta = useCallback((filaId: string) => cambios[filaId] ?? abiertaPorDefecto(filaId), [cambios]);
  // En el teléfono un toque puede llegar dos veces: la segunda deshacía el cierre.
  const alternar = (filaId: string) => {
    const marca = `${epoca}:${filaId}`;
    const t = Date.now();
    if (t - (recien.get(marca) ?? 0) < 400) return;
    recien.set(marca, t);
    const actuales = leerCambios(leerTexto(epoca));
    const ahora = actuales[filaId] ?? abiertaPorDefecto(filaId);
    escribirCambios(epoca, { ...actuales, [filaId]: !ahora });
  };
  return { abierta, alternar };
}
