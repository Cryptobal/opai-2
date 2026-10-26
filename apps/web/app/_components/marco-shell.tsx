"use client";

import { Building2, LogOut, Settings2, UserRound } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { AppShell, type ItemMenu, type Portal } from "@opai/ds";

import { accionSalir } from "@/app/_acciones/auth";
import { cambiarTenant } from "@/app/_acciones/capacidad";
import type { ItemNav } from "@/lib/navegacion";

import { useCabecera } from "./cabecera-contexto";
import { Campana } from "./campana";
import { icono } from "./iconos";
import { LinkMenu } from "./link-menu";
import { useEpocaSesion } from "./refresco-navegador";

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
  /** Quién y en qué empresa ve la página (`lib/epoca-sesion.ts`); las pestañas la comparan. */
  epoca: string;
};

/**
 * Shell persistente del portal (ADR-045): vive en el layout de cada portal, así que la navegación,
 * los portales, la campana, ⌘K y el menú de usuario no se vuelven a montar al cambiar de página; solo
 * se reemplaza el contenido. El título y las acciones de la página llegan por el almacén de cabecera
 * (`cabecera-contexto`), que la página fija al renderizarse.
 */
export function MarcoShell({ datos, children }: { datos: DatosShell; children: ReactNode }) {
  const rutaActual = usePathname();
  const router = useRouter();
  const cabecera = useCabecera();
  const [password, setPassword] = useState(false);
  const [paleta, setPaleta] = useState<boolean | null>(null);
  const buscable = datos.portal === "erp" && datos.tenant !== null;
  useEpocaSesion(datos.epoca);
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
  // La navegación no cambia al fijar la cabecera: se recalcula solo cuando cambia `datos.nav`.
  const nav = useMemo(() => datos.nav.map((n) => ({ ...n, icono: icono(n.icono) })), [datos.nav]);
  const empresas: ItemMenu[] =
    datos.empresas.length > 1
      ? datos.empresas.map((e, i) => ({
          id: `t-${e.id}`,
          ...(i === 0 ? { grupo: "Cambiar de empresa" } : {}),
          etiqueta: e.nombre,
          icono: Building2,
          marcado: e.actual,
          onSelect: () => {
            void cambiarTenant(e.id);
          },
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
      onSelect: () => {
        void accionSalir();
      },
    },
  ];
  return (
    <AppShell
      titulo={cabecera.titulo}
      {...(cabecera.volver ? { volver: cabecera.volver } : {})}
      {...(cabecera.volverSoloTelefono ? { volverSoloTelefono: true } : {})}
      {...(cabecera.volverBajoLg ? { volverBajoLg: true } : {})}
      {...(cabecera.acciones ? { acciones: cabecera.acciones } : {})}
      {...(cabecera.accionesTelefono ? { accionesTelefono: cabecera.accionesTelefono } : {})}
      {...(cabecera.insignia ? { insignia: cabecera.insignia } : {})}
      {...(cabecera.completo ? { completo: true } : {})}
      nav={nav}
      portales={datos.portales}
      portalActual={datos.portal}
      rutaActual={rutaActual}
      {...(datos.tenant ? { tenant: datos.tenant } : {})}
      {...(empresas.length ? { empresas } : {})}
      usuario={datos.usuario}
      menuUsuario={menu}
      campana={datos.tenant ? <Campana portal={datos.portal} /> : undefined}
      {...(buscable ? { onBuscar: () => setPaleta(true) } : {})}
      onNavegar={(href) => router.push(href)}
      Link={LinkMenu}
    >
      {children}
      {paleta !== null ? <Paleta abierto={paleta} onCerrar={() => setPaleta(false)} /> : null}
      {password ? <CambiarPassword abierto onCerrar={() => setPassword(false)} /> : null}
      <Avisos />
    </AppShell>
  );
}
