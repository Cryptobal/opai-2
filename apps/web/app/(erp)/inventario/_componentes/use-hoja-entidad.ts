"use client";

import { useRouter } from "next/navigation";

import { avisar } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

/**
 * Hoja de crear o editar un tipo o un activo: `ejecutar` (con el id literal de la capacidad) y `terminar`,
 * que avisa, cierra la hoja y, al crear, abre la ficha nueva.
 */
export function useHojaEntidad(editando: boolean, ruta: string) {
  const hoja = useHojaUrl(editando ? "editar" : "nuevo");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  function terminar(r: { id: string } | null, exito: string) {
    if (!r) return;
    avisar.exito(exito);
    hoja.cerrar();
    if (!editando) router.push(`${ruta}/${r.id}`);
  }
  return { hoja, ejecutar, pendiente, error, terminar };
}
