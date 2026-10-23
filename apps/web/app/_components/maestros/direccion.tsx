"use client";

import { useCallback, useState } from "react";

import { CampoDireccion, type Direccion } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Sugerencia = { placeId: string; texto: string; secundario: string | null };

const SIN_SERVICIO = "No pudimos consultar el servicio de mapas.";

/** `CampoDireccion` conectado al servicio de geolocalización del núcleo (`core.geo.*`). */
export function DireccionOpai(props: {
  id?: string;
  valor: Direccion | null;
  onCambiar: (d: Direccion | null) => void;
  geocercaM?: number | null;
  sinMapa?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const buscar = useCallback(async (texto: string) => {
    if (texto.trim().length < 3) return [];
    try {
      const r = await ejecutarCapacidad("erp", "core.geo.autocompletar", { texto });
      if (!r.ok) {
        setError(`${SIN_SERVICIO} ${r.error.message}`);
        return [];
      }
      setError(null);
      return (r.data as Sugerencia[]).map((s) => ({
        valor: s.placeId,
        etiqueta: s.texto,
        ...(s.secundario ? { detalle: s.secundario } : {}),
      }));
    } catch {
      setError(`${SIN_SERVICIO} Revisa tu conexión e inténtalo de nuevo.`);
      return [];
    }
  }, []);
  const resolver = useCallback(async (placeId: string): Promise<Direccion | null> => {
    try {
      const r = await ejecutarCapacidad("erp", "core.geo.detalle", { placeId });
      if (!r.ok) {
        setError(`No pudimos obtener el detalle de la dirección. ${r.error.message}`);
        return null;
      }
      setError(null);
      if (!r.data) return null;
      const d = r.data as Direccion & { direccionFormateada: string };
      return { ...d, calle: d.calle ?? d.direccionFormateada };
    } catch {
      setError("No pudimos obtener el detalle de la dirección. Inténtalo de nuevo.");
      return null;
    }
  }, []);
  return <CampoDireccion {...props} error={error} buscar={buscar} resolver={resolver} />;
}
