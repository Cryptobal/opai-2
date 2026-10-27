"use client";

import { useEffect, useRef, useState } from "react";

import { InputBusqueda } from "@opai/ds";

import { useParametros } from "./use-url";

type Props = { placeholder: string; param?: string; atajo?: string };

let panelActivo: Element | null = null;

/**
 * Búsqueda instantánea: actualiza `?q=` al escribir (250 ms) y el servidor vuelve a renderizar la
 * lista. La tecla "/" enfoca el campo.
 */
export function Buscador({ placeholder, param = "q", atajo = "/" }: Props) {
  const { valor, fijar } = useParametros();
  const actual = valor(param) ?? "";
  const [texto, setTexto] = useState(actual);
  // Solo navega cuando el texto difiere de la URL (evita bucles al re-renderizar).
  const destino = useRef({ actual, fijar });
  useEffect(() => {
    destino.current = { actual, fijar };
  });
  useEffect(() => {
    if (texto.trim() === destino.current.actual) return;
    const t = setTimeout(
      () =>
        destino.current.fijar({
          [param]: texto.trim() || null,
          ...(param === "pq" ? {} : { cursor: null, prev: null }),
        }),
      250,
    );
    return () => clearTimeout(t);
  }, [texto, param]);
  useEffect(() => {
    const activar = (e: Event) => {
      const elemento = e.target as Element | null;
      let panel = elemento?.closest("section[aria-label]") ?? null;
      while (panel && !panel.querySelector("input[data-buscador]")) {
        panel = panel.parentElement?.closest("section[aria-label]") ?? null;
      }
      if (panel) panelActivo = panel;
    };
    const tecla = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement | null;
      if (e.key !== atajo || destino?.closest("input, textarea, [contenteditable]")) return;
      const buscadores = [
        ...document.querySelectorAll<HTMLInputElement>("input[data-buscador]"),
      ].filter((input) => input.getClientRects().length > 0);
      const elegido = buscadores.find((input) => panelActivo?.contains(input)) ?? buscadores.at(-1);
      if (!elegido || elegido.dataset.buscador !== param) return;
      e.preventDefault();
      elegido.focus();
    };
    window.addEventListener("pointerdown", activar);
    window.addEventListener("focusin", activar);
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("pointerdown", activar);
      window.removeEventListener("focusin", activar);
      window.removeEventListener("keydown", tecla);
    };
  }, [atajo, param]);
  return (
    <InputBusqueda
      valor={texto}
      onCambiar={setTexto}
      placeholder={placeholder}
      aria-label={placeholder}
      atajo={atajo}
      data-buscador={param}
    />
  );
}
