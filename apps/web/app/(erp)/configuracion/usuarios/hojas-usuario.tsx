"use client";

import { useHojaUrl } from "@/app/_components/maestros/use-url";

import { EditarUsuario } from "./editar-usuario";
import { InvitarUsuario } from "./invitar-usuario";
import type { Miembro } from "./usuarios-lista";

/** Hojas de Usuarios abiertas por URL: `?invitar=1` y `?editar=<membresía>`. */
export function HojasUsuario({ usuarios, miRol }: { usuarios: Miembro[]; miRol: string }) {
  const invitar = useHojaUrl("invitar");
  const editar = useHojaUrl("editar");
  const miembro = usuarios.find((u) => u.id === editar.valor) ?? null;
  return (
    <>
      <InvitarUsuario abierto={invitar.abierta} onCerrar={invitar.cerrar} miRol={miRol} />
      <EditarUsuario miembro={miembro} onCerrar={editar.cerrar} miRol={miRol} />
    </>
  );
}
