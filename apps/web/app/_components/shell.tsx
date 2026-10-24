"use client";

import { Building2, LogOut, Settings2, UserRound } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, startTransition, useEffect, useState } from "react";

import { AppShell, type ItemMenu, type Portal, type Volver } from "@opai/ds";

import { accionSalir } from "@/app/_acciones/auth";
import { cambiarTenant } from "@/app/_acciones/capacidad";
import type { ItemNav } from "@/lib/navegacion";

import { Campana } from "./campana";
import { icono } from "./iconos";
import { LinkMenu } from "./link-menu";

// La paleta (cmdk) se descarga al primer uso: no pesa en el JS inicial de cada ruta (ADR-037).
const Paleta = dynamic(() => import("./paleta").then((m) => m.Paleta), { ssr: false });
// Los avisos (sonner) también: se montan después de hidratar y no bloquean el primer render.
// El cambio de contraseña (formulario y diálogo) solo se descarga si se abre.
const CambiarPassword = dynamic(() => import("./cambiar-password").then((m) => m.CambiarPassword));
const Avisos = dynamic(() => import("./avisos").then((m) => m.Avisos), { ssr: false });

// Refresco silencioso: una página que vino de la caché del navegador (generada hace más de 15 s) se
// vuelve a pedir en segundo plano, sin esqueleto. El tope por ruta evita bucles si el reloj está
// desfasado (ADR-045 decisión 16).
const EDAD_MAXIMA_MS = 15_000;
const ultimoRefresco = new Map<string, number>();

export type DatosShell = {
  portal: string;
  nav: ItemNav[];
  portales: Portal[];
  tenant: { nombre: string } | null;
  usuario: { nombre: string; email: string; rol?: string };
  empresas: { id: string; nombre: string; actual: boolean }[];
  noLeidas: number;
  /** Hora (ms) en que el servidor generó esta página; si es vieja, vino de la caché del navegador. */
  generado: number;
};

export type OpcionesPagina = {
  titulo: string;
  volver?: Volver;
  volverSoloTelefono?: boolean;
  acciones?: ReactNode;
  accionesTelefono?: ReactNode;
  insignia?: ReactNode;
  completo?: boolean;
  /** Esqueleto (de servidor, sin JS) que reemplaza el contenido si la navegación pasa de ~200 ms. */
  esqueleto?: ReactNode;
};

/** Shell real: navegación, portales, campana, ⌘K y menú de usuario a partir de la sesión. */
export function Shell({
  datos,
  children,
  esqueleto,
  ...pagina
}: OpcionesPagina & { datos: DatosShell; children: ReactNode }) {
  const rutaActual = usePathname();
  const router = useRouter();
  const [password, setPassword] = useState(false);
  const [paleta, setPaleta] = useState<boolean | null>(null);
  const buscable = datos.portal === "erp" && datos.tenant !== null;
  useEffect(() => {
    const ahora = Date.now();
    if (ahora - datos.generado < EDAD_MAXIMA_MS) return;
    if (ahora - (ultimoRefresco.get(rutaActual) ?? 0) < EDAD_MAXIMA_MS) return;
    ultimoRefresco.set(rutaActual, ahora);
    startTransition(() => router.refresh());
  }, [datos.generado, rutaActual, router]);
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
      {...(datos.portal === "platform" ? { subtituloMarca: "Plataforma" } : {})}
      onNavegar={(href) => router.push(href)}
      Link={LinkMenu}
    >
      <div data-contenido className="contents">
        {children}
      </div>
      {esqueleto ? <div data-esqueleto>{esqueleto}</div> : null}
      {paleta !== null ? <Paleta abierto={paleta} onCerrar={() => setPaleta(false)} /> : null}
      {password ? <CambiarPassword abierto onCerrar={() => setPassword(false)} /> : null}
      <Avisos />
    </AppShell>
  );
}
