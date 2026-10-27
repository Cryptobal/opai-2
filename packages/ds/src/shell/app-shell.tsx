import type { ReactNode } from "react";

import { cn } from "../cn";
import { BottomNav } from "./nav";
import { Rail } from "./rail";
import { Sidebar } from "./sidebar";
import type { ItemFijado } from "./fijados";
import { AppBar, type ComunesBarra, TopBarTelefono } from "./top-bar";
import type { NavItem } from "./types";

export type AppShellProps = ComunesBarra & {
  /** Título de la página: va en la barra superior de iPad y desktop. En teléfono lo muestra el patrón
   *  (que recibe el mismo título y lo oculta en md+). */
  titulo: string;
  nav: readonly NavItem[];
  /** Barra inferior del teléfono (Brief 05, §3): si falta, usa `nav` como antes. */
  navInferior?: readonly NavItem[];
  rutaActual: string;
  /** Acción principal de la página en la barra superior (md+); en teléfono va en el patrón. */
  acciones?: ReactNode;
  /** Acciones en la barra del teléfono cuando hay "Atrás" (menú ⋯ del detalle). */
  accionesTelefono?: ReactNode;
  insignia?: ReactNode;
  onNavegar?: (href: string) => void;
  /** Contenido a alto completo (vistas divididas): sin márgenes del contenedor en md+. */
  completo?: boolean;
  /** Fijados y acordeón por área (D1, D3): ver `Sidebar`. */
  fijados?: readonly ItemFijado[];
  errorFijados?: boolean;
  reintentarFijados?: () => void;
  onFijar?: (item: NavItem) => void;
  onDesfijar?: (href: string) => void;
  areaAbierta?: string | null;
  onAreaAbierta?: (area: string) => void;
  children: ReactNode;
  className?: string;
};

/**
 * Shell de OPAI 2.0 (ADR-007, ADR-050; export ShellPhone, ShellTablet y ShellDesktop): barra superior
 * con selector de portal, Buscar, campana y avatar, y navegación inferior en teléfono; riel en iPad;
 * barra lateral con el usuario al pie en desktop. Configuración, fija al pie.
 */
export function AppShell(props: AppShellProps) {
  const { titulo, nav, rutaActual, acciones, insignia, children, className, Link } = props;
  const { accionesTelefono, onNavegar, completo, navInferior, ...barra } = props;
  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <Rail
        Link={Link}
        items={nav}
        rutaActual={rutaActual}
        portales={props.portales}
        portalActual={props.portalActual}
        tenant={props.tenant}
        empresas={props.empresas}
        {...(props.fijados ? { fijados: props.fijados } : {})}
        {...(props.errorFijados ? { errorFijados: true } : {})}
        {...(props.reintentarFijados ? { reintentarFijados: props.reintentarFijados } : {})}
        {...(props.onDesfijar ? { onDesfijar: props.onDesfijar } : {})}
        {...(onNavegar ? { onNavegar } : {})}
      />
      <Sidebar
        items={nav}
        rutaActual={rutaActual}
        portales={props.portales}
        portalActual={props.portalActual}
        tenant={props.tenant}
        empresas={props.empresas}
        usuario={props.usuario}
        menuUsuario={props.menuUsuario}
        {...(props.fijados ? { fijados: props.fijados } : {})}
        {...(props.errorFijados ? { errorFijados: true } : {})}
        {...(props.reintentarFijados ? { reintentarFijados: props.reintentarFijados } : {})}
        {...(props.onFijar ? { onFijar: props.onFijar } : {})}
        {...(props.onDesfijar ? { onDesfijar: props.onDesfijar } : {})}
        {...(props.areaAbierta !== undefined ? { areaAbierta: props.areaAbierta } : {})}
        {...(props.onAreaAbierta ? { onAreaAbierta: props.onAreaAbierta } : {})}
        Link={Link}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBarTelefono {...barra} acciones={accionesTelefono ?? null} />
        <AppBar
          {...barra}
          titulo={titulo}
          {...(insignia ? { insignia } : {})}
          {...(acciones ? { acciones } : {})}
        />
        <main
          className={cn(
            "mx-auto flex w-full flex-1 flex-col px-4 pt-1 pb-[calc(56px+16px+env(safe-area-inset-bottom))] md:px-6 md:pt-5 md:pb-8 xl:px-8",
            !completo && "max-w-[1280px]",
            className,
          )}
        >
          {children}
        </main>
      </div>
      <BottomNav
        items={nav}
        principales={navInferior}
        rutaActual={rutaActual}
        {...(props.fijados ? { fijados: props.fijados } : {})}
        {...(props.errorFijados ? { errorFijados: true } : {})}
        {...(props.reintentarFijados ? { reintentarFijados: props.reintentarFijados } : {})}
        {...(props.onDesfijar ? { onDesfijar: props.onDesfijar } : {})}
        {...(props.menuUsuario ? { extras: props.menuUsuario } : {})}
        {...(onNavegar ? { onNavegar } : {})}
        Link={Link}
      />
    </div>
  );
}
