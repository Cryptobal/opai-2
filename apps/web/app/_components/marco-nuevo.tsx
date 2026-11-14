"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

import type { AppShellProps } from "@opai/ds";
import { ShellNuevo } from "@opai/ds/shell-nuevo";

import { cookieMenu } from "@/lib/marco";
import { cookieAnchoMenu } from "@/lib/menu-ancho";

import { useAcentoEmpresa } from "./acento-empresa";
import { abrirAgente } from "./agente/abrir-agente";
import { alternarTema } from "./hilo/marco-cliente";
import { MarcoShell } from "./marco-shell";
import type { DatosShell } from "./tipos-shell";

type Props = { datos: DatosShell; menuPlegado: boolean; menuAncho?: number; children: ReactNode };

/** Logo de la empresa para el selector del menú (CAR-335 D6b); llega después de leer la marca. */
const LogoEmpresa = createContext<string | undefined>(undefined);

/**
 * Marco del diseño nuevo (ADR-109, CAR-335 D2): el mismo shell del clásico con `ShellNuevo` (piel,
 * menú plegable y barra con el buscador al centro y el tema) y el color de la empresa como acento.
 * Va en su propio trozo de JS, como Hilo. El menú plegado se recuerda en una cookie que el servidor
 * lee al cargar (`menuPlegado`), así que se pinta plegado desde el primer byte.
 */
export function MarcoNuevo({ datos, menuPlegado, menuAncho, children }: Props) {
  const enErp = datos.portal === "erp" && datos.tenant !== null && datos.acceso;
  const logo = useAcentoEmpresa(enErp, datos.portal, datos.epoca);
  // Un solo componente por montaje: `MarcoShell` lo usa como tipo y no debe cambiar entre renders.
  const [Shell] = useState(() => {
    const portal = datos.portal;
    // La pestaña «Agente» del teléfono abre el mismo panel que el botón de la barra (evento del shell).
    const conAgente = Boolean(datos.agente);
    // Trabajador y terreno conservan sus pestañas en el teléfono (CAR-335 D6e).
    const terreno = portal === "trabajador" || portal === "terreno";
    return function ShellDelMarco(props: AppShellProps) {
      const logoEmpresa = useContext(LogoEmpresa);
      return (
        <ShellNuevo
          {...props}
          {...(props.tenant && logoEmpresa
            ? { tenant: { ...props.tenant, logo: logoEmpresa } }
            : {})}
          plegadoInicial={menuPlegado}
          onPlegado={(plegado) => {
            document.cookie = cookieMenu(plegado);
          }}
          {...(menuAncho ? { anchoInicial: menuAncho } : {})}
          onAncho={(ancho) => {
            document.cookie = cookieAnchoMenu(ancho);
          }}
          onTema={() => alternarTema(portal)}
          {...(conAgente ? { onAgente: () => abrirAgente() } : {})}
          pestanasDelPortal={terreno}
        />
      );
    };
  });
  return (
    <LogoEmpresa.Provider value={logo}>
      <MarcoShell datos={datos} Shell={Shell}>
        {children}
      </MarcoShell>
    </LogoEmpresa.Provider>
  );
}
