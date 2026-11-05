"use client";

import { type RefObject, useRef, useState } from "react";

import { type AreaMas, areasAbiertasIniciales, guardarAreasAbiertas, leerAreasAbiertas } from "./mas-areas";

/**
 * Estado del menú «Más»: áreas abiertas (recordadas por usuario y empresa) y modo búsqueda. Al abrirlo
 * se parte de lo recordado más el área actual y sin búsqueda a medias; al cancelar la búsqueda se
 * vuelve al menú tal como estaba (mismas áreas, mismo desplazamiento).
 */
export function useEstadoMas(abierto: boolean, areas: readonly AreaMas[], epoca: string | undefined, hayBusqueda: boolean) {
  const iniciales = () => areasAbiertasIniciales(areas, leerAreasAbiertas(epoca));
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(iniciales);
  const [buscando, setBuscando] = useState(false);
  const [q, setQ] = useState("");
  const [previo, setPrevio] = useState(abierto);
  const lista = useRef<HTMLDivElement>(null);
  const cabecera = useRef<HTMLDivElement>(null);
  const desplazado = useRef(0);
  if (abierto !== previo) {
    setPrevio(abierto);
    if (abierto) {
      setAbiertas(iniciales());
      setBuscando(false);
      setQ("");
    }
  }
  return {
    abiertas,
    q,
    setQ,
    lista: lista as RefObject<HTMLDivElement | null>,
    cabecera: cabecera as RefObject<HTMLDivElement | null>,
    enBusqueda: buscando && hayBusqueda,
    alternar: (id: string) => {
      const siguiente = new Set(abiertas);
      if (!siguiente.delete(id)) siguiente.add(id);
      setAbiertas(siguiente);
      guardarAreasAbiertas(epoca, siguiente);
    },
    empezar: () => {
      desplazado.current = lista.current?.scrollTop ?? 0;
      setBuscando(true);
    },
    cancelar: () => {
      cabecera.current?.querySelector("input")?.blur();
      setQ("");
      setBuscando(false);
      requestAnimationFrame(() => lista.current && (lista.current.scrollTop = desplazado.current));
    },
  };
}
