"use client";

import { Building2, LogOut, Settings2, UserRound } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { AppShell, type ItemMenu, type Portal, type Volver } from "@opai/ds";

import { accionSalir } from "@/app/_acciones/auth";
import { cambiarTenant } from "@/app/_acciones/capacidad";
import type { ItemNav } from "@/lib/navegacion";

import { Campana } from "./campana";
import { icono } from "./iconos";
import { LinkNext } from "./link-next";
import { subtituloMarcaPortal } from "./portales";

// La paleta (cmdk) se descarga al primer uso: no pesa en el JS inicial de cada ruta (ADR-037).
const Paleta = dynamic(() => import("./paleta").then((m) => m.Paleta), { ssr: false });
// Los avisos (sonner) también: se montan después de hidratar y no bloquean el primer render.
// El cambio de contraseña (formulario y diálogo) solo se descarga si se abre.
const CambiarPassword = dynamic(() => import("./cambiar-password").then((m) => m.CambiarPassword));
const Avisos = dynamic(() => import("./avisos").then((m) => m.Avisos), { ssr: false });

export type DatosShell = {
  portal: string;
  nav: ItemNav[];
  portales: Portal[];
  tenant: { nombre: string } | null;
  usuario: { nombre: string; email: string; rol?: string };
  empresas: { id: string; nombre: string; actual: boolean }[];
  noLeidas: number;
};

export type OpcionesPagina = {
  titulo: string;
  volver?: Volver;
  volverSoloTelefono?: boolean;
  acciones?: ReactNode;
  accionesTelefono?: ReactNode;
  insignia?: ReactNode;
  completo?: boolean;
};

/** Shell real: navegación, portales, campana, ⌘K y menú de usuario a partir de la sesión. */
export function Shell({
  datos,
  children,
  ...pagina
}: OpcionesPagina & { datos: DatosShell; children: ReactNode }) {
  const rutaActual = usePathname();
  const router = useRouter();
  const [password, setPassword] = useState(false);
  const [paleta, setPaleta] = useState<boolean | null>(null);
  const buscable = datos.portal === "erp" && datos.tenant !== null;
  useEffect(() => {
    if (!buscable) return;
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaleta(true);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [buscable]);
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
    ...(datos.portal === "erp" && datos.tenant
      ? [
          {
            id: "pref",
            grupo: "Cuenta",
            etiqueta: "Preferencias",
            icono: Settings2,
            onSelect: () => router.push("/configuracion/preferencias"),
          },
        ]
      : []),
    {
      id: "password",
      ...(datos.portal === "erp" && datos.tenant ? {} : { grupo: "Cuenta" }),
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
  const subtitulo = subtituloMarcaPortal(datos.portal);
  return (
    <AppShell
      {...pagina}
      nav={datos.nav.map((n) => ({ ...n, icono: icono(n.icono) }))}
      portales={datos.portales}
      portalActual={datos.portal}
      rutaActual={rutaActual}
      {...(datos.tenant ? { tenant: datos.tenant } : {})}
      {...(empresas.length ? { empresas } : {})}
      usuario={datos.usuario}
      menuUsuario={menu}
      campana={
        datos.tenant ? <Campana noLeidas={datos.noLeidas} portal={datos.portal} /> : undefined
      }
      {...(buscable ? { onBuscar: () => setPaleta(true) } : {})}
      {...(subtitulo ? { subtituloMarca: subtitulo } : {})}
      onNavegar={(href) => router.push(href)}
      Link={LinkNext}
    >
      {children}
      {paleta !== null ? <Paleta abierto={paleta} onCerrar={() => setPaleta(false)} /> : null}
      {password ? <CambiarPassword abierto onCerrar={() => setPassword(false)} /> : null}
      <Avisos />
    </AppShell>
  );
}
