"use client";

import { useEffect, useRef, useState } from "react";

import { InputBusqueda } from "@opai/ds";

import { useParametros } from "./use-url";

type Props = { placeholder: string; param?: string; atajo?: string };

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
      () => destino.current.fijar({ [param]: texto.trim() || null, cursor: null, prev: null }),
      250,
    );
    return () => clearTimeout(t);
  }, [texto, param]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement | null;
      if (e.key !== atajo || destino?.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      document.querySelector<HTMLInputElement>(`input[data-buscador="${param}"]`)?.focus();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
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
