"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { escribirCambios, leerCambios, leerTexto, suscribir } from "./almacen-filas-abiertas";
import { abiertaPorDefecto } from "./estructura";

/**
 * Qué secciones, grupos y clientes de la planilla están abiertos, recordado por persona y empresa (`epoca`)
 * en el navegador: no se guarda en el servidor. Sin lo guardado rige `abiertaPorDefecto`.
 */
export function useFilasAbiertas(epoca: string) {
  const texto = useSyncExternalStore(suscribir, () => leerTexto(epoca), () => "");
  const cambios = useMemo(() => leerCambios(texto), [texto]);
  const abierta = useCallback((filaId: string) => cambios[filaId] ?? abiertaPorDefecto(filaId), [cambios]);
  const alternar = (filaId: string) => escribirCambios(epoca, { ...cambios, [filaId]: !abierta(filaId) });
  return { abierta, alternar };
}
