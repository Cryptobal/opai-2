"use client";

import { Building2, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { AppShell, type ItemMenu, type LinkComponent, type Portal } from "@opai/ds";

import { accionSalir } from "@/app/_acciones/auth";
import { cambiarTenant } from "@/app/_acciones/capacidad";
import type { ItemNav } from "@/lib/navegacion";

import { CambiarPassword } from "./cambiar-password";
import { icono } from "./iconos";

const LinkNext: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
  </Link>
);

export type DatosShell = {
  portal: string;
  nav: ItemNav[];
  portales: Portal[];
  tenant: { nombre: string } | null;
  usuario: { nombre: string; email: string; rol?: string };
  empresas: { id: string; nombre: string; actual: boolean }[];
};

/** Shell real: navegación, portales y menú de usuario a partir de la sesión (Brief 01). */
export function Shell({
  datos,
  titulo,
  children,
}: {
  datos: DatosShell;
  titulo: string;
  children: ReactNode;
}) {
  const rutaActual = usePathname();
  const [password, setPassword] = useState(false);
  const empresas: ItemMenu[] =
    datos.empresas.length > 1
      ? datos.empresas.map((e, i) => ({
          id: `t-${e.id}`,
          ...(i === 0 ? { grupo: "Cambiar de empresa" } : {}),
          etiqueta: e.nombre,
          icono: Building2,
          marcado: e.actual,
          onSelect: () => void cambiarTenant(e.id),
        }))
      : [];
  const menu: ItemMenu[] = [
    ...empresas,
    {
      id: "password",
      grupo: "Cuenta",
      etiqueta: "Cambiar contraseña",
      icono: UserRound,
      onSelect: () => setPassword(true),
    },
    {
      id: "salir",
      etiqueta: "Cerrar sesión",
      icono: LogOut,
      peligro: true,
      onSelect: () => void accionSalir(),
    },
  ];
  return (
    <AppShell
      titulo={titulo}
      nav={datos.nav.map((n) => ({ ...n, icono: icono(n.icono) }))}
      portales={datos.portales}
      portalActual={datos.portal}
      rutaActual={rutaActual}
      {...(datos.tenant ? { tenant: datos.tenant } : {})}
      usuario={datos.usuario}
      menuUsuario={menu}
      Link={LinkNext}
    >
      {children}
      <CambiarPassword abierto={password} onCerrar={() => setPassword(false)} />
    </AppShell>
  );
}
