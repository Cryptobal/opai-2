"use client";

import { useHojaUrl } from "@/app/_components/maestros/use-url";

import type { RolVista } from "./_permisos/roles";
import type { ModuloCatalogo } from "./_permisos/etiquetas";
import { EditarUsuario } from "./editar-usuario";
import { InvitarUsuario } from "./invitar-usuario";
import type { Miembro } from "./usuarios-lista";

/** Datos de roles y permisos que comparten la ficha y sus secciones (CAR-37). */
export type PropsFicha = {
  miRol: string;
  roles: RolVista[];
  catalogo: ModuloCatalogo[];
  concedibles: string[];
  gestionaRoles: boolean;
};

/** Hojas de Usuarios abiertas por URL: `?invitar=1` y `?editar=<membresía>`. */
export function HojasUsuario({ usuarios, ...ficha }: PropsFicha & { usuarios: Miembro[] }) {
  const invitar = useHojaUrl("invitar");
  const editar = useHojaUrl("editar");
  const miembro = usuarios.find((u) => u.id === editar.valor) ?? null;
  const owners = usuarios.filter((u) => u.rol === "owner" && u.estado === "activa").length;
  return (
    <>
      <InvitarUsuario abierto={invitar.abierta} onCerrar={invitar.cerrar} miRol={ficha.miRol} />
      <EditarUsuario
        {...ficha}
        miembro={miembro}
        onCerrar={editar.cerrar}
        ultimoOwner={miembro?.rol === "owner" && owners <= 1}
      />
    </>
  );
}
