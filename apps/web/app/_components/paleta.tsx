"use client";

import { Building2, MapPin, Settings, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { CommandPalette, type GrupoPaleta } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { destinoAjuste } from "@/lib/ajuste-destino";
import type { AccionCmdK } from "@/lib/navegacion-entradas";
import type { ItemNav } from "@/lib/navegacion";

import { abrirAgente } from "./agente/abrir-agente";
import { icono } from "./iconos";
import { useRecientesPaleta } from "./use-recientes-paleta";

/** Prefijo del id de la fila «Preguntar a OPAI»; el resto del id es el texto buscado. */
const ASK = "agente:";
const grupoAgente = (hay: boolean, q: string): GrupoPaleta[] =>
  hay
    ? [{ titulo: "Agente", items: [{ id: ASK + q, etiqueta: q ? `Preguntar a OPAI: «${q}»` : "Preguntar a OPAI", icono: Sparkles, href: "#" }] }]
    : [];
type Resultado = { id: string; titulo: string; detalle: string | null; href: string };
type Busqueda = Record<"cuentas" | "instalaciones" | "personas" | "contactos", Resultado[]>;
type Ajuste = { modulo: string; clave: string; etiqueta: string; grupo: string | null };

/** Paleta ⌘K del ERP: `core.buscar` y `core.config.buscar` (ajustes). Se carga al primer uso. */
export function Paleta({
  abierto,
  onCerrar,
  epoca,
  acciones,
  nav,
  agente = false,
}: {
  abierto: boolean;
  onCerrar: () => void;
  epoca: string;
  acciones: AccionCmdK[];
  nav: ItemNav[];
  /** Hay agente interno disponible: se ofrece «Preguntar a OPAI». */
  agente?: boolean;
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
      ...grupoAgente(agente, ""),
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
        ...grupoAgente(agente, q),
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
            href: destinoAjuste(x),
          })),
        },
      ];
      return grupos.filter((g) => g.items.length > 0);
    },
    [nav, acciones, agente],
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
        if (it.id.startsWith(ASK)) return abrirAgente({ borrador: it.id.slice(ASK.length) });
        router.push(it.href);
      }}
    />
  );
}
