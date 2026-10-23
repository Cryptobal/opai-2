"use client";

import { Building2, MapPin, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { CommandPalette, type GrupoPaleta } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Resultado = { id: string; titulo: string; detalle: string | null; href: string };
type Busqueda = Record<"cuentas" | "instalaciones" | "personas" | "contactos", Resultado[]>;
type Ajuste = { modulo: string; clave: string; etiqueta: string; grupo: string | null };

const IR_A = [
  { id: "cuentas", etiqueta: "Cuentas", href: "/cuentas", icono: Building2 },
  { id: "instalaciones", etiqueta: "Instalaciones", href: "/instalaciones", icono: MapPin },
  { id: "personas", etiqueta: "Personas", href: "/personas", icono: UserRound },
  { id: "config", etiqueta: "Configuración", href: "/configuracion", icono: Settings },
];

/** Sección del centro de Configuración donde vive un ajuste. */
function seccionDe(a: Ajuste): string {
  if (a.modulo !== "core") return `/configuracion/modulo/${a.modulo}`;
  if (a.clave.startsWith("documentos")) return "/configuracion/documentos";
  if (a.clave.startsWith("preferencias") || a.clave.startsWith("usuario"))
    return "/configuracion/preferencias";
  if (a.clave.startsWith("comunicaciones")) return "/configuracion/comunicaciones";
  return "/configuracion/empresa";
}

/** Paleta ⌘K del ERP: `core.buscar` y `core.config.buscar` (ajustes). Se carga al primer uso. */
export function Paleta({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const router = useRouter();
  const buscar = useCallback(async (q: string): Promise<GrupoPaleta[]> => {
    const [r, a] = await Promise.all([
      ejecutarCapacidad("erp", "core.buscar", { q }),
      ejecutarCapacidad("erp", "core.config.buscar", { q }),
    ]);
    const d = r.ok ? (r.data as Busqueda) : null;
    const t = q.toLowerCase();
    const grupos: GrupoPaleta[] = [
      { titulo: "Ir a", items: IR_A.filter((i) => i.etiqueta.toLowerCase().includes(t)) },
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
  }, []);
  return (
    <CommandPalette
      abierto={abierto}
      onCerrar={onCerrar}
      buscar={buscar}
      iniciales={[{ titulo: "Ir a", items: IR_A }]}
      onElegir={(it) => {
        onCerrar();
        router.push(it.href);
      }}
    />
  );
}
