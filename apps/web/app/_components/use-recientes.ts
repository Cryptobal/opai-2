"use client";

import { useEffect } from "react";

import { normalizarHref } from "@opai/ds";

export type Reciente = { href: string; etiqueta: string };

const MAXIMO = 10;

function clave(epoca: string): string {
  return `opai_recientes_${epoca}`;
}

/**
 * Recientes (§4.3): hasta diez, en el navegador por usuario y empresa (`epoca`), no en el servidor
 * (evita auditoría y consultas por página, ADR-045). Sin almacenamiento disponible (modo privado,
 * §10), ⌘K funciona igual, solo sin recientes.
 */
export function leerRecientes(epoca: string): Reciente[] {
  try {
    const crudo = localStorage.getItem(clave(epoca));
    const datos: unknown = crudo ? JSON.parse(crudo) : [];
    if (!Array.isArray(datos)) return [];
    return datos
      .filter(
        (d): d is Reciente =>
          d !== null &&
          typeof d === "object" &&
          typeof d.href === "string" &&
          /^\/(?!\/)/.test(d.href) &&
          d.href.length <= 200 &&
          typeof d.etiqueta === "string" &&
          d.etiqueta.length <= 80,
      )
      .slice(0, MAXIMO);
  } catch {
    return [];
  }
}

function escribirRecientes(epoca: string, lista: Reciente[]): void {
  try {
    localStorage.setItem(clave(epoca), JSON.stringify(lista));
  } catch {
    // Modo privado u otro bloqueo: la sesión sigue sin recientes.
  }
}

export function registrarReciente(epoca: string, entrada: Reciente): void {
  // Sin barra final, query ni hash: `/cotizaciones/` y `/cotizaciones` son el mismo reciente.
  const item = { ...entrada, href: normalizarHref(entrada.href) };
  const previos = leerRecientes(epoca).filter((r) => r.href !== item.href);
  escribirRecientes(epoca, [item, ...previos].slice(0, MAXIMO));
}

/** Registra la página actual como reciente, con un pequeño retraso para que ya tenga su título. */
export function useRegistrarReciente(
  epoca: string,
  href: string,
  etiqueta: string,
  activo: boolean,
) {
  useEffect(() => {
    if (!activo || !etiqueta || href === "/") return;
    const t = setTimeout(() => registrarReciente(epoca, { href, etiqueta }), 400);
    return () => clearTimeout(t);
  }, [epoca, href, etiqueta, activo]);
}
