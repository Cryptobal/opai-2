"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { BottomNav } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { useContextoTerreno } from "./contexto-terreno";
import { seccionesActivas } from "./secciones-terreno";

/** Barra inferior del equipo: Inicio y cada sección de Terreno que la empresa tiene activa (CAR-801). */
export function NavegacionTerreno() {
  const ruta = usePathname();
  const { datos } = useContextoTerreno();
  const items = useMemo(() => {
    const activas = seccionesActivas(datos?.modulos ?? null).filter((s) => s.etiqueta !== "Inicio");
    const inicio = seccionesActivas(datos?.modulos ?? null).find((s) => s.href === "/terreno");
    return [
      ...(inicio ?
        [
          {
            href: inicio.href,
            etiqueta: inicio.etiqueta,
            corta: inicio.corta,
            icono: inicio.icono,
            ...(inicio.exacta ? { exacta: true as const } : {}),
          },
        ]
      : []),
      ...activas.map((s) => ({
        href: s.href,
        etiqueta: s.etiqueta,
        corta: s.corta,
        icono: s.icono,
      })),
    ];
  }, [datos?.modulos]);

  if (items.length < 2) return null;
  return <BottomNav items={items} rutaActual={ruta} Link={LinkNext} />;
}