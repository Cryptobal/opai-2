"use client";

import { useCallback, useState } from "react";

import { CampoDireccion, type Direccion } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Sugerencia = { placeId: string; texto: string; secundario: string | null };

/** El detalle técnico de Google queda en Configuración → Integraciones (Probar) y en el log; no se muestra a cualquier usuario. */
const SIN_SERVICIO = "El mapa no responde. Escribe la dirección a mano y avisa a un administrador.";

/** `CampoDireccion` conectado al servicio de geolocalización del núcleo (`core.geo.*`). */
export function DireccionOpai(props: {
  id?: string;
  valor: Direccion | null;
  onCambiar: (d: Direccion | null) => void;
  geocercaM?: number | null;
  sinMapa?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  // Una falla (de la capacidad o de la red) se muestra en el campo; nunca se devuelve un vacío mudo.
  const llamar = useCallback(async (id: string, input: Record<string, unknown>) => {
    const r = await ejecutarCapacidad("erp", id, input).catch(() => null);
    setError(r?.ok ? null : SIN_SERVICIO);
    return r?.ok ? r.data : null;
  }, []);
  const buscar = useCallback(
    async (texto: string) => {
      const corto = texto.trim().length < 3;
      if (corto) setError(null);
      const d = corto ? null : await llamar("core.geo.autocompletar", { texto });
      return ((d as Sugerencia[] | null) ?? []).map((s) => ({
        valor: s.placeId,
        etiqueta: s.texto,
        ...(s.secundario ? { detalle: s.secundario } : {}),
      }));
    },
    [llamar],
  );
  const resolver = useCallback(
    async (placeId: string): Promise<Direccion | null> => {
      const d = (await llamar("core.geo.detalle", { placeId })) as
        (Direccion & { direccionFormateada: string }) | null;
      return d ? { ...d, calle: d.calle ?? d.direccionFormateada } : null;
    },
    [llamar],
  );
  return <CampoDireccion {...props} error={error} buscar={buscar} resolver={resolver} />;
}
