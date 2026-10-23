import type { ReactNode } from "react";

import { cn } from "../cn";
import { type LinkComponent, LinkPorDefecto } from "../shell/types";
import { TabsEstado } from "./tabs-estado";

export type Tab = {
  id: string;
  etiqueta: string;
  contenido?: ReactNode;
  contador?: number;
  /** Pestaña como ruta real (`/cuentas/<id>/contactos`): server-first y enlazable (ADR-037). */
  href?: string;
};

type TabsProps = {
  tabs: readonly Tab[];
  /** Modo con estado: pestaña inicial. */
  inicial?: string;
  /** Modo por ruta: id de la pestaña activa (la página la deduce de la ruta). */
  activa?: string;
  /** Componente de enlace (next/link) en modo por ruta. Por defecto, <a>. */
  Link?: LinkComponent;
  /** Modo por ruta: contenido de la pestaña activa (la página hija). */
  children?: ReactNode;
  className?: string;
};

export const estiloTab = (seleccionada: boolean) =>
  cn(
    "-mb-px inline-flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-base font-medium whitespace-nowrap transition-colors",
    seleccionada ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg",
  );

export function ContadorTab({ n }: { n: number | undefined }) {
  return n !== undefined ? <span className="t-numeric text-xs text-fg-subtle">{n}</span> : null;
}

/**
 * Pestañas accesibles (role=tablist), 44px, subrayado en el color de texto. Dos modos: por ruta
 * (`href` en cada tab, sin estado, renderizable en servidor) o con estado (`contenido`).
 */
export function Tabs(props: TabsProps) {
  const { tabs, activa, children, className } = props;
  if (!tabs.some((t) => t.href)) return <TabsEstado {...props} />;
  const Link = props.Link ?? LinkPorDefecto;
  const actual = tabs.find((t) => t.id === activa) ?? tabs[0];
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <nav
        aria-label="Secciones"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
      >
        {tabs.map((tab) => {
          const seleccionada = tab.id === actual?.id;
          return (
            <Link
              key={tab.id}
              href={tab.href ?? "#"}
              className={estiloTab(seleccionada)}
              aria-current={seleccionada ? "page" : undefined}
            >
              {tab.etiqueta}
              <ContadorTab n={tab.contador} />
            </Link>
          );
        })}
      </nav>
      <div>{children ?? actual?.contenido}</div>
    </div>
  );
}
