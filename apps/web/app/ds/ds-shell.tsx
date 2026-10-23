"use client";

import { Building2, Home, LogOut, Palette, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppShell, type LinkComponent } from "@opai/ds";

import { Campana } from "./componentes-nuevos/campana-muestra";

const LinkNext: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
  </Link>
);

const nada = () => undefined;

/** Shell de muestra para /ds: datos ficticios, independiente de la sesión. */
export function DsShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      titulo="Diseño · DS 2.0"
      nav={[
        { href: "/", etiqueta: "Inicio", icono: Home },
        { href: "/ds", etiqueta: "Diseño", icono: Palette, grupo: "Desarrollo" },
      ]}
      portales={[
        { id: "erp", etiqueta: "ERP", href: "/" },
        { id: "platform", etiqueta: "Plataforma", href: "/platform" },
      ]}
      portalActual="erp"
      rutaActual="/ds"
      tenant={{ nombre: "Gard Security" }}
      usuario={{ nombre: "Carlos Irigoyen", email: "carlos.irigoyen@opai.cl", rol: "Owner" }}
      menuUsuario={[
        {
          id: "gard",
          grupo: "Empresa",
          etiqueta: "Gard Security",
          icono: Building2,
          marcado: true,
          onSelect: nada,
        },
        { id: "aseos", etiqueta: "Aseos del Sur", icono: Building2, onSelect: nada },
        {
          id: "perfil",
          grupo: "Cuenta",
          etiqueta: "Cambiar contraseña",
          icono: UserRound,
          onSelect: nada,
        },
        { id: "salir", etiqueta: "Cerrar sesión", icono: LogOut, peligro: true, onSelect: nada },
      ]}
      campana={<Campana n={3} />}
      onBuscar={nada}
      Link={LinkNext}
    >
      {children}
    </AppShell>
  );
}
