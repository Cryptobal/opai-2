"use client";

import { useHojaUrl } from "@/app/_components/maestros/use-url";

import type { RolVista } from "../_permisos/roles";
import type { ModuloCatalogo } from "../_permisos/etiquetas";
import { HojaRol } from "./hoja-rol";

export type PropsHojas = {
  roles: RolVista[];
  catalogo: ModuloCatalogo[];
  concedibles: string[];
  gestiona: boolean;
};

/** Hojas de Roles abiertas por URL: `?rol=<id>` (detalle y edición) y `?nuevo=1|<id a duplicar>`. */
export function HojasRol(props: PropsHojas) {
  const rol = useHojaUrl("rol");
  const nuevo = useHojaUrl("nuevo");
  const actual = props.roles.find((r) => r.id === rol.valor) ?? null;
  return (
    <>
      {nuevo.abierta && props.gestiona ? (
        <HojaRol
          key={`nuevo:${nuevo.valor ?? ""}`}
          {...props}
          rol={null}
          base={props.roles.find((r) => r.id === nuevo.valor) ?? null}
          onCerrar={nuevo.cerrar}
        />
      ) : null}
      {actual ? (
        <HojaRol key={actual.id} {...props} rol={actual} base={null} onCerrar={rol.cerrar} />
      ) : null}
    </>
  );
}
