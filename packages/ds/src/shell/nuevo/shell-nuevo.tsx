"use client";

import { type PointerEvent, useEffect, useState } from "react";

import { AppShell, type AppShellProps } from "../app-shell";
import { BotonFijarMenu, BotonPlegarMenu } from "./botones-menu";

const CLAVE_PLEGADO = "opai_menu_plegado";
/** Ancho del menú lateral completo (`Sidebar`, 248 px) más un margen para no cerrarlo en el borde. */
const ANCHO_MENU = 264;

function leerPlegado(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_PLEGADO) === "1";
  } catch {
    return false;
  }
}

function guardarPlegado(plegado: boolean) {
  try {
    window.localStorage.setItem(CLAVE_PLEGADO, plegado ? "1" : "0");
  } catch {
    // Sin almacenamiento (modo privado): el menú vuelve a su estado por defecto en la próxima visita.
  }
}

/**
 * Shell del diseño nuevo (ADR-109, CAR-335 D2; diseño en docs/2.0/design/export-diseno-nuevo/): el
 * mismo shell que el clásico, con la piel `data-marco="nuevo"` y el menú lateral plegable. Plegado, se
 * ve el riel de íconos; al pasar el mouse se asoma el menú completo sobre la página y se vuelve a
 * esconder al alejarse o al elegir. Este navegador recuerda si el menú queda plegado. La visibilidad
 * va por `data-menu` y reglas de `styles.css`, y el componente se importa aparte
 * (`@opai/ds/shell-nuevo`): el shell clásico no carga nada de esto (ADR-037).
 */
export function ShellNuevo(props: AppShellProps) {
  const [plegado, setPlegado] = useState(false);
  const [asomado, setAsomado] = useState(false);
  useEffect(() => setPlegado(leerPlegado()), []);
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
    guardarPlegado(valor);
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
