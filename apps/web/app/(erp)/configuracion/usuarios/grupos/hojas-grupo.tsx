"use client";

import { useHojaUrl } from "@/app/_components/maestros/use-url";

import { HojaGrupo } from "./hoja-grupo";
import { HojaNuevoGrupo } from "./hoja-nuevo-grupo";
import type { GrupoVista } from "./tipos";

export type PropsHojasGrupo = { grupos: GrupoVista[]; gestiona: boolean };

/** Hojas de Grupos abiertas por URL: `?grupo=<id>` (detalle, edición y miembros) y `?nuevo=1`. */
export function HojasGrupo({ grupos, gestiona }: PropsHojasGrupo) {
  const grupo = useHojaUrl("grupo");
  const nuevo = useHojaUrl("nuevo");
  const actual = grupos.find((g) => g.id === grupo.valor) ?? null;
  return (
    <>
      {nuevo.abierta && gestiona ? <HojaNuevoGrupo onCerrar={nuevo.cerrar} /> : null}
      {actual ? (
        <HojaGrupo key={actual.id} grupo={actual} gestiona={gestiona} onCerrar={grupo.cerrar} />
      ) : null}
    </>
  );
}
