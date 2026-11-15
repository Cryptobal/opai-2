"use client";

import { Home, Menu as IconoMenu, Sparkles } from "lucide-react";

import { cn } from "../../cn";
import { Avatar } from "../../components/avatar";
import { EVENTO_PESTANA_BARRA, HojaSobreBarra } from "../../components/hoja-sobre-barra";
import { type ItemMenu, Menu } from "../../components/menu";
import { Punto } from "../contador";
import { MenuMas } from "../menu-mas";
import type { AppShellProps } from "../app-shell";
import { esActivo, LinkPorDefecto } from "../types";

const clase = (activo: boolean) =>
  cn(
    "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs leading-3",
    activo ? "font-semibold text-fg" : "font-medium text-fg-muted",
  );

type Props = AppShellProps & {
  /** Abre el panel del agente; sin agente disponible no hay pestaña «Agente». */
  onAgente?: (() => void) | undefined;
  /** «Cambiar entre día y noche» dentro de «Yo»: en teléfono el tema vive ahí. */
  onTema?: (() => void) | undefined;
};

/**
 * Barra inferior del teléfono en el diseño nuevo (ADR-109, CAR-335 D2c; `export-diseno-nuevo/Telefono`):
 * Inicio, Agente, Menú (la hoja con todas las áreas y la búsqueda) y Yo (cuenta, novedades, tema y
 * salir). Reemplaza a la barra inferior clásica solo dentro de `ShellNuevo`.
 */
export function BarraInferiorNueva(props: Props) {
  const { nav, rutaActual, usuario, onAgente, onTema } = props;
  const Link = props.Link ?? LinkPorDefecto;
  const inicio = nav.find((i) => i.href === "/") ?? nav[0];
  const enInicio = inicio
    ? esActivo(rutaActual, inicio.href, inicio.exacta, inicio.activoEn)
    : false;
  const yo: ItemMenu[] = [
    ...(onTema ? [{ id: "tema", etiqueta: "Cambiar entre día y noche", onSelect: onTema }] : []),
    ...(props.menuUsuario ?? []),
  ];
  // Tocar Inicio, Menú o Yo deja la pestaña Agente (el panel del agente escucha y se cierra).
  const otraPestana = () => window.dispatchEvent(new Event(EVENTO_PESTANA_BARRA));
  return (
    <nav
      aria-label="Principal"
      data-shell="inferior-nuevo"
      onClickCapture={(e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t?.closest("[data-pestana-agente]")) otraPestana();
      }}
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface md:hidden"
    >
      <ul className="flex px-1">
        {inicio ? (
          <li className="flex-1">
            <Link
              href={inicio.href}
              aria-current={enInicio ? "page" : undefined}
              className={clase(enInicio)}
              data-tab="inicio"
            >
              <Home className={cn("size-5", enInicio && "text-accent")} aria-hidden />
              Inicio
            </Link>
          </li>
        ) : null}
        {onAgente ? (
          <li className="flex-1">
            <button
              type="button"
              onClick={onAgente}
              className={clase(false)}
              data-pestana-agente=""
              data-tab="agente"
            >
              <Sparkles className="size-5" aria-hidden />
              Agente
            </button>
          </li>
        ) : null}
        <li className="flex-1">
          <HojaSobreBarra.Provider value>
            <MenuMas
              items={nav.filter((i) => i.href !== inicio?.href)}
              rutaActual={rutaActual}
              extras={[]}
              etiqueta="Menú"
              {...(props.fijados ? { fijados: props.fijados } : {})}
              {...(props.errorFijados ? { errorFijados: true } : {})}
              {...(props.reintentarFijados ? { reintentarFijados: props.reintentarFijados } : {})}
              {...(props.onFijar ? { onFijar: props.onFijar } : {})}
              {...(props.onDesfijar ? { onDesfijar: props.onDesfijar } : {})}
              {...(props.epoca ? { epoca: props.epoca } : {})}
              {...(props.busquedaMas ? { busqueda: props.busquedaMas } : {})}
              {...(props.recientes ? { recientes: props.recientes } : {})}
              {...(props.onNavegar ? { onNavegar: props.onNavegar } : {})}
              disparador={
                <span className={clase(!enInicio)} data-tab="menu">
                  <IconoMenu className={cn("size-5", !enInicio && "text-accent")} aria-hidden />
                  Menú
                </span>
              }
            />
          </HojaSobreBarra.Provider>
        </li>
        {usuario && yo.length ? (
          <li className="flex-1">
            <Menu
              etiqueta={usuario.aviso ? "Yo, hay novedades sin leer" : "Yo"}
              items={yo}
              lado="arriba-derecha"
              className="w-full"
              claseDisparador="w-full"
              claseContenido="w-[248px]"
              cabecera={
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-fg">{usuario.nombre}</p>
                  {usuario.email ? (
                    <p className="truncate text-xs text-fg-muted">{usuario.email}</p>
                  ) : null}
                </div>
              }
              disparador={
                <span className={clase(false)} data-tab="yo">
                  <span className="relative inline-flex">
                    <Avatar nombre={usuario.nombre} size="sm" />
                    <Punto visible={usuario.aviso} peligro />
                  </span>
                  Yo
                </span>
              }
            />
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
