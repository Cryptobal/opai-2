"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

type Props = { cursor: string };

/** Página siguiente de la cola cuando hay más de 100 alertas (CAR-521). */
export function CargarMasCola({ cursor }: Props) {
  const path = usePathname();
  const params = useSearchParams();
  const q = new URLSearchParams(params.toString());
  q.set("cursor", cursor);
  return (
    <EnlaceBoton href={`${path}?${q.toString()}`} variante="secondary">
      Ver más alertas
    </EnlaceBoton>
  );
}