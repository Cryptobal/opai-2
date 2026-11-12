"use client";

import { useEffect, useState } from "react";

import { type AppShellProps, AppShellBase } from "../app-shell";

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
 * esconder al salir o al elegir. Este navegador recuerda si el menú queda plegado.
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
  // Asomado, se esconde cuando el mouse se aleja del menú (también si el menú apareció bajo el mouse
  // sin que este se moviera, caso en que el navegador no avisa la salida).
  useEffect(() => {
    if (!asomado) return;
    const mover = (e: PointerEvent) => {
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
  return (
    <div data-marco="nuevo">
      <AppShellBase
        {...props}
        plegables={{
          sidebar: {
            plegado,
            asomado,
            onPlegar: () => cambiar(true),
            onEsconder: () => setAsomado(false),
          },
          riel: {
            plegado,
            tapado: asomado,
            onAsomar: () => setAsomado(true),
            onFijar: () => cambiar(false),
          },
        }}
      />
    </div>
  );
}
