"use client";

import { useEffect, useRef, useState } from "react";

import { Select } from "@opai/ds";

type EtapaSelector = { id: string; nombre: string; n: number };

const telefono = () => window.matchMedia("(max-width: 767.98px)").matches;
const columna = (id: string) => document.getElementById(`etapa-${id}`);

/**
 * Deja la etapa elegida en la URL (`?etapa=`) sin recargar, para que «Lista» y volver al tablero la
 * conserven. La primera etapa es la vista por defecto: no se escribe.
 */
function recordar(id: string, primera: string | undefined) {
  const u = new URL(location.href);
  if (id === primera) u.searchParams.delete("etapa");
  else u.searchParams.set("etapa", id);
  if (u.href !== location.href) history.replaceState(null, "", u);
}

/**
 * Teléfono: elige la columna visible del tablero (una a la vez) y la desplaza a la vista. También
 * sigue el deslizamiento (la columna que ocupa la pantalla pasa a ser la elegida) y, al volver con
 * `?etapa=`, abre en esa columna (CAR-33).
 */
export function SelectorEtapa({
  etapas,
  inicial,
}: {
  etapas: EtapaSelector[];
  inicial?: string | undefined;
}) {
  const primera = etapas[0]?.id;
  const deUrl = etapas.some((e) => e.id === inicial) ? inicial : undefined;
  const [actual, setActual] = useState(deUrl ?? primera);
  // Destino de un desplazamiento pedido (selector o etapa de la URL): se ignoran las columnas de
  // paso, incluida la primera, que es la visible antes de restaurar.
  const destino = useRef<string | null>(null);
  const datos = useRef({ deUrl, primera });

  const irA = (id: string, behavior: ScrollBehavior) => {
    destino.current = id;
    // Si la columna ya estaba a la vista no hay evento: no bloquear el seguimiento.
    setTimeout(() => {
      if (destino.current === id) destino.current = null;
    }, 1000);
    columna(id)?.scrollIntoView({ behavior, block: "nearest", inline: "start" });
  };

  useEffect(() => {
    const { deUrl: id } = datos.current;
    if (id && telefono()) irA(id, "instant");
  }, []);

  useEffect(() => {
    const contenedor = document.getElementById("columnas-tablero");
    if (!contenedor || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entradas) => {
        if (!telefono()) return;
        for (const e of entradas) {
          const id = (e.target as HTMLElement).dataset["etapa"];
          if (!id || !e.isIntersecting || e.intersectionRatio < 0.6) continue;
          if (destino.current && destino.current !== id) continue;
          destino.current = null;
          setActual(id);
          recordar(id, datos.current.primera);
        }
      },
      { root: contenedor, threshold: [0.6] },
    );
    contenedor.querySelectorAll("[data-etapa]").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  return (
    <div className="md:hidden">
      <Select
        aria-label="Etapa visible"
        valor={actual}
        opciones={etapas.map((e) => ({ valor: e.id, etiqueta: `${e.nombre} · ${e.n}` }))}
        onCambiar={(id) => {
          setActual(id);
          recordar(id, primera);
          irA(id, "smooth");
        }}
      />
    </div>
  );
}
