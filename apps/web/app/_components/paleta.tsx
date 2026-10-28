"use client";

import { Building2, MapPin, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { CommandPalette, type GrupoPaleta } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import type { AccionCmdK } from "@/lib/navegacion-entradas";
import type { ItemNav } from "@/lib/navegacion";

import { icono } from "./iconos";
import { useRecientesPaleta } from "./use-recientes-paleta";

type Resultado = { id: string; titulo: string; detalle: string | null; href: string };
type Busqueda = Record<"cuentas" | "instalaciones" | "personas" | "contactos", Resultado[]>;
type Ajuste = { modulo: string; clave: string; etiqueta: string; grupo: string | null };

/** Sección del centro de Configuración donde vive un ajuste. */
function seccionDe(a: Ajuste): string {
  if (a.modulo !== "core") return `/configuracion/modulo/${a.modulo}`;
  if (a.clave.startsWith("documentos")) return "/configuracion/documentos";
  if (
    a.clave.startsWith("navegacion") ||
    a.clave.startsWith("preferencias") ||
    a.clave.startsWith("usuario")
  )
    return "/configuracion/preferencias";
  if (a.clave.startsWith("comunicaciones")) return "/configuracion/comunicaciones";
  return "/configuracion/empresa";
}

/** Paleta ⌘K del ERP: `core.buscar` y `core.config.buscar` (ajustes). Se carga al primer uso. */
export function Paleta({
  abierto,
  onCerrar,
  epoca,
  acciones,
  nav,
}: {
  abierto: boolean;
  onCerrar: () => void;
  epoca: string;
  acciones: AccionCmdK[];
  nav: ItemNav[];
}) {
  const router = useRouter();
  const { recientes, limpiarRecientes } = useRecientesPaleta(abierto, epoca, nav);
  const iniciales = (() => {
    const visibles = recientes.flatMap((r) => {
      const entrada = nav.find((n) => n.href === r.href);
      return [
        {
          id: r.href,
          etiqueta: entrada?.etiqueta ?? r.etiqueta,
          href: r.href,
          icono: icono(entrada?.icono ?? "Pin"),
        },
      ];
    });
    return [
      { titulo: "Recientes", items: visibles },
      { titulo: "Acciones", items: acciones.map((a) => ({ ...a, icono: icono(a.icono) })) },
    ].filter((g) => g.items.length > 0);
  })();
  const buscar = useCallback(
    async (q: string): Promise<GrupoPaleta[]> => {
      const [r, a] = await Promise.all([
        ejecutarCapacidad("erp", "core.buscar", { q }),
        ejecutarCapacidad("erp", "core.config.buscar", { q }),
      ]);
      const d = r.ok ? (r.data as Busqueda) : null;
      const t = q.toLowerCase();
      const grupos: GrupoPaleta[] = [
        {
          titulo: "Acciones",
          items: acciones
            .filter((a) => a.etiqueta.toLowerCase().includes(t))
            .map((a) => ({ ...a, icono: icono(a.icono) })),
        },
        {
          titulo: "Ir a",
          items: nav.filter((i) => i.etiqueta.toLowerCase().includes(t)).map((i) => ({ id: i.href, href: i.href, etiqueta: i.etiqueta, icono: icono(i.icono) })),
        },
        {
          titulo: "Cuentas",
          items: (d?.cuentas ?? []).map((x) => ({
            id: x.id,
            etiqueta: x.titulo,
            ...(x.detalle ? { detalle: x.detalle } : {}),
            icono: Building2,
            href: x.href,
          })),
        },
        {
          titulo: "Instalaciones",
          items: (d?.instalaciones ?? []).map((x) => ({
            id: x.id,
            etiqueta: x.titulo,
            ...(x.detalle ? { detalle: x.detalle } : {}),
            icono: MapPin,
            href: x.href,
          })),
        },
        {
          titulo: "Personas",
          items: (d?.personas ?? []).map((x) => ({
            id: x.id,
            etiqueta: x.titulo,
            ...(x.detalle ? { detalle: x.detalle } : {}),
            persona: true,
            href: x.href,
          })),
        },
        {
          titulo: "Contactos",
          items: (d?.contactos ?? []).map((x) => ({
            id: x.id,
            etiqueta: x.titulo,
            ...(x.detalle ? { detalle: x.detalle } : {}),
            persona: true,
            href: x.href,
          })),
        },
        {
          titulo: "Ajustes",
          items: (a.ok ? (a.data as Ajuste[]) : []).slice(0, 5).map((x) => ({
            id: `${x.modulo}.${x.clave}`,
            etiqueta: x.etiqueta,
            detalle: `Configuración${x.grupo ? ` › ${x.grupo}` : ""}`,
            icono: Settings,
            href: seccionDe(x),
          })),
        },
      ];
      return grupos.filter((g) => g.items.length > 0);
    },
    [nav, acciones],
  );
  return (
    <CommandPalette
      abierto={abierto}
      onCerrar={() => { limpiarRecientes(); onCerrar(); }}
      buscar={buscar}
      iniciales={iniciales}
      onElegir={(it) => {
        limpiarRecientes();
        onCerrar();
        router.push(it.href);
      }}
    />
  );
}
