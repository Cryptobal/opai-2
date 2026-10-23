"use client";

import { useCallback } from "react";

import { CampoDireccion, type Direccion } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Sugerencia = { placeId: string; texto: string; secundario: string | null };

/** `CampoDireccion` conectado al servicio de geolocalización del núcleo (`core.geo.*`). */
export function DireccionOpai(props: {
  id?: string;
  valor: Direccion | null;
  onCambiar: (d: Direccion | null) => void;
  geocercaM?: number | null;
  sinMapa?: boolean;
}) {
  const buscar = useCallback(async (texto: string) => {
    if (texto.trim().length < 3) return [];
    const r = await ejecutarCapacidad("erp", "core.geo.autocompletar", { texto });
    return r.ok
      ? (r.data as Sugerencia[]).map((s) => ({
          valor: s.placeId,
          etiqueta: s.texto,
          ...(s.secundario ? { detalle: s.secundario } : {}),
        }))
      : [];
  }, []);
  const resolver = useCallback(async (placeId: string): Promise<Direccion | null> => {
    const r = await ejecutarCapacidad("erp", "core.geo.detalle", { placeId });
    if (!r.ok || !r.data) return null;
    const d = r.data as Direccion & { direccionFormateada: string };
    return { ...d, calle: d.calle ?? d.direccionFormateada };
  }, []);
  return <CampoDireccion {...props} buscar={buscar} resolver={resolver} />;
}
