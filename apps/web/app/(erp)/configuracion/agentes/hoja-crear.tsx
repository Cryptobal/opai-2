"use client";

import { useHojaUrl } from "@/app/_components/maestros/use-url";

import { CrearApiKey } from "./crear-api-key";

/** "Crear key" abierta por `?crear=1` (acción de la cabecera, server-first). */
export function HojaCrearKey({ scopes, permisos }: { scopes: string[]; permisos: string[] }) {
  const hoja = useHojaUrl("crear");
  return (
    <CrearApiKey
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      scopesDisponibles={scopes}
      permisosDisponibles={permisos}
    />
  );
}
