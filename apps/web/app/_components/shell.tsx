"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell, type LinkComponent } from "@opai/ds";

import { navDe, PORTALES } from "./portales";

const LinkNext: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
  </Link>
);

type Props = { portal: string; titulo: string; children: ReactNode };

/** Shell de la app: inyecta next/link, la ruta actual y la navegación del portal. */
export function Shell({ portal, titulo, children }: Props) {
  const rutaActual = usePathname();
  return (
    <AppShell
      titulo={titulo}
      nav={navDe(portal)}
      portales={PORTALES}
      portalActual={portal}
      rutaActual={rutaActual}
      usuario={{ nombre: "Sin sesión (Brief 01)", iniciales: "—" }}
      Link={LinkNext}
    >
      {children}
    </AppShell>
  );
}
