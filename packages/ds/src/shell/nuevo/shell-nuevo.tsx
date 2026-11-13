"use client";

import { type PointerEvent, useEffect, useState } from "react";

import { AppShell, type AppShellProps } from "../app-shell";
import { BotonFijarMenu, BotonPlegarMenu, BotonTema } from "./botones-menu";

/** Ancho del menú lateral completo (`Sidebar`, 248 px) más un margen para no cerrarlo en el borde. */
const ANCHO_MENU = 264;

export type ShellNuevoProps = AppShellProps & {
  /** Menú plegado al cargar: lo lee el servidor (cookie) para pintarlo así desde el primer byte. */
  plegadoInicial?: boolean;
  /** La app recuerda la elección (cookie de este navegador). */
  onPlegado?: (plegado: boolean) => void;
  /** Botón de tema de la barra superior (iPad y escritorio). */
  onTema?: () => void;
};

/**
 * Shell del diseño nuevo (ADR-109, CAR-335 D2; diseño en docs/2.0/design/export-diseno-nuevo/): el
 * mismo shell que el clásico, con la piel `data-marco="nuevo"` y el menú lateral plegable. Plegado, se
 * ve el riel de íconos; al pasar el mouse se asoma el menú completo sobre la página y se vuelve a
 * esconder al alejarse o al elegir. La app recuerda si queda plegado y lo pasa al cargar, sin parpadeo. La visibilidad
 * va por `data-menu` y reglas de `styles.css`, y el componente se importa aparte
 * (`@opai/ds/shell-nuevo`): el shell clásico no carga nada de esto (ADR-037).
 */
export function ShellNuevo({ plegadoInicial, onPlegado, onTema, ...props }: ShellNuevoProps) {
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
  // Al elegir una pantalla del menú asomado, se esconde.
  useEffect(() => setAsomado(false), [props.rutaActual]);
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
    window.addEventListener("pointermove", mover);
    return () => window.removeEventListener("pointermove", mover);
  }, [asomado]);
  const cambiar = (valor: boolean) => {
    setPlegado(valor);
    setAsomado(false);
    onPlegado?.(valor);
  };
  const asomar = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || asomado) return;
    if (e.target instanceof Element && e.target.closest('nav[data-shell="riel"]')) setAsomado(true);
  };
  const fijar = <BotonFijarMenu onFijar={() => cambiar(false)} />;
  return (
    <div
      data-marco="nuevo"
      data-menu={asomado ? "asomado" : plegado ? "plegado" : "fijo"}
      onPointerOver={asomar}
    >
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
    </div>
  );
}
