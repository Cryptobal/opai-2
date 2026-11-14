"use client";

import { type PointerEvent, useEffect, useState } from "react";

import { AppShell, type AppShellProps } from "../app-shell";
import { LinkPorDefecto } from "../types";
import { BandaConexion } from "./banda-conexion";
import { BarraInferiorNueva } from "./barra-inferior";
import { RielNuevo } from "./riel-nuevo";
import { BotonFijarMenu, BotonPlegarMenu, BotonTema } from "./botones-menu";

/** Ancho del menú lateral completo (`Sidebar`, 248 px) más un margen para no cerrarlo en el borde. */
const ANCHO_MENU = 264;
const DENTRO_DEL_MENU =
  'nav[data-shell="sidebar"], [data-radix-popper-content-wrapper], [role="menu"], [role="dialog"], [role="listbox"]';

export type ShellNuevoProps = AppShellProps & {
  /** Menú plegado al cargar: lo lee el servidor (cookie) para pintarlo así desde el primer byte. */
  plegadoInicial?: boolean;
  /** La app recuerda la elección (cookie de este navegador). */
  onPlegado?: (plegado: boolean) => void;
  /** Botón de tema de la barra superior (iPad y escritorio) y en «Yo» del teléfono. */
  onTema?: () => void;
  /** Pestaña «Agente» de la barra inferior del teléfono; sin agente no aparece. */
  onAgente?: () => void;
  /** Trabajador y terreno: el teléfono conserva las pestañas del portal (CAR-335 D6e). */
  pestanasDelPortal?: boolean;
};

/**
 * Shell del diseño nuevo (ADR-109, CAR-335 D2; docs/2.0/design/export-diseno-nuevo/): el shell clásico
 * con la piel `data-marco="nuevo"` y el menú lateral plegable (riel; al pasar el mouse se asoma el menú
 * completo). Se importa aparte (`@opai/ds/shell-nuevo`): el shell clásico no carga nada de esto (ADR-037).
 */
export function ShellNuevo({
  plegadoInicial,
  onPlegado,
  onTema,
  onAgente,
  pestanasDelPortal = false,
  ...props
}: ShellNuevoProps) {
  const [plegado, setPlegado] = useState(plegadoInicial ?? false);
  const [asomado, setAsomado] = useState(false);
  // Los menús y diálogos se pintan en <body>: el atributo en <html> les da la misma piel.
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset["marco"] = "nuevo";
    return () => {
      if (raiz.dataset["marco"] === "nuevo") delete raiz.dataset["marco"];
    };
  }, []);
  useEffect(() => setAsomado(false), [props.rutaActual]); // al elegir una pantalla, se esconde
  // Asomado: el riel queda tapado (fuera del árbol de accesibilidad, para no repetir «Principal») y
  // el menú se esconde cuando el mouse se aleja, también si apareció bajo el mouse sin que se moviera.
  useEffect(() => {
    const riel = document.querySelector<HTMLElement>('[data-marco="nuevo"] nav[data-shell="riel"]');
    riel?.toggleAttribute("inert", asomado);
    if (asomado) riel?.setAttribute("aria-hidden", "true");
    else riel?.removeAttribute("aria-hidden");
    if (!asomado) return;
    const mover = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "mouse" && e.clientX > ANCHO_MENU) setAsomado(false);
    };
    // En pantalla táctil (iPad) no hay mouse que se aleje: tocar fuera del menú lo cierra. Los menús
    // que abre el propio menú (empresa, usuario) se pintan en <body> y no cuentan como «fuera».
    const tocar = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "mouse" || !(e.target instanceof Element)) return;
      if (!e.target.closest(DENTRO_DEL_MENU)) setAsomado(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="menu"]')) setAsomado(false);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerdown", tocar);
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerdown", tocar);
      window.removeEventListener("keydown", tecla);
    };
  }, [asomado]);
  const cambiar = (valor: boolean) => {
    setPlegado(valor);
    setAsomado(false);
    onPlegado?.(valor);
  };
  const asomar = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || asomado) return;
    if (!(e.target instanceof Element) || !e.target.closest('nav[data-shell="riel"]')) return;
    // CAR-386: si el mouse entra por el ícono de un área, el menú se asoma con esa área abierta,
    // así el aviso del ícono (p. ej. «2» en Comercial) se ve en la misma entrada al desplegarse.
    const area = e.target.closest<HTMLElement>("[data-area]")?.dataset["area"];
    if (area && props.areaAbierta !== area) props.onAreaAbierta?.(area);
    setAsomado(true);
  };
  const fijar = <BotonFijarMenu onFijar={() => cambiar(false)} />;
  // Tocar un área del riel abre el menú completo sobre la página con esa área desplegada.
  const abrirArea = (area: string) => {
    // `onAreaAbierta` alterna: si el área ya está abierta, se deja así.
    if (props.areaAbierta !== area) props.onAreaAbierta?.(area);
    setAsomado(true);
    // El riel queda inerte: el foco pasa al menú para que el teclado no lo pierda.
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(
          'nav[data-shell="sidebar"] a[href], nav[data-shell="sidebar"] button',
        )
        ?.focus(),
    );
  };
  return (
    <div
      data-marco="nuevo"
      data-menu={asomado ? "asomado" : plegado ? "plegado" : "fijo"}
      {...(pestanasDelPortal ? { "data-pestanas": "portal" } : {})}
      onPointerOver={asomar}
      className="flex"
    >
      <RielNuevo
        items={props.nav}
        rutaActual={props.rutaActual}
        Link={props.Link ?? LinkPorDefecto}
        portales={props.portales}
        portalActual={props.portalActual}
        tenant={props.tenant}
        empresas={props.empresas}
        boton={plegado ? fijar : undefined}
        onArea={abrirArea}
      />
      <AppShell
        {...props}
        textoBusqueda="Busca o pídele algo a OPAI"
        {...(onTema ? { tema: <BotonTema onTema={onTema} /> } : {})}
        botonesMenu={{
          sidebar: plegado ? (
            asomado ? (
              fijar
            ) : undefined
          ) : (
            <BotonPlegarMenu onPlegar={() => cambiar(true)} />
          ),
          riel: plegado ? fijar : undefined,
        }}
      />
      {!pestanasDelPortal && <BarraInferiorNueva {...props} onAgente={onAgente} onTema={onTema} />}
      <BandaConexion />
    </div>
  );
}
