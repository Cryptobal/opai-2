"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { avisar } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { BASE, type PortalRendicion } from "../tipos";

/** Lo que `crear` y `actualizar` reciben (el servidor valida todo; aquí solo viaja). */
export type Cuerpo = Record<string, unknown>;

type Salida = { id: string; codigoVisible: string };

/**
 * Guardar y enviar una rendición. La primera escritura crea el borrador (con clave de idempotencia
 * propia de este formulario) y las siguientes lo actualizan, así que un reintento nunca duplica
 * la rendición. Toda regla (aprobador, fecha, respaldo) la decide el servidor.
 */
export function useGuardado(portal: PortalRendicion, idInicial?: string) {
  const router = useRouter();
  const id = useRef(idInicial);
  const clave = useRef(globalThis.crypto.randomUUID());
  const claveEnvio = useRef(globalThis.crypto.randomUUID());
  const [ocupado, setOcupado] = useState<"guardar" | "enviar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function escribir(cuerpo: Cuerpo): Promise<Salida | null> {
    const r = id.current
      ? await ejecutarCapacidad(portal, "rendiciones.rendiciones.actualizar", {
          ...cuerpo,
          id: id.current,
        })
      : await ejecutarCapacidad(
          portal,
          "rendiciones.rendiciones.crear",
          cuerpo,
          false,
          "ninguna",
          clave.current,
        );
    if (!r.ok) {
      setError(r.error.message);
      return null;
    }
    const s = r.data as Salida;
    id.current = s.id;
    return s;
  }

  async function correr(modo: "guardar" | "enviar", cuerpo: Cuerpo, aprobadorId?: string) {
    setOcupado(modo);
    setError(null);
    try {
      const s = await escribir(cuerpo);
      if (!s) return;
      if (modo === "enviar") {
        const e = await ejecutarCapacidad(
          portal,
          "rendiciones.rendiciones.enviar",
          { id: s.id, ...(aprobadorId ? { aprobadorId } : {}) },
          false,
          "layout",
          claveEnvio.current,
        );
        if (!e.ok) {
          setError(e.error.message);
          return;
        }
      }
      avisar.exito(
        modo === "enviar"
          ? `${s.codigoVisible} enviada a aprobación`
          : `${s.codigoVisible} guardada como borrador`,
      );
      router.push(modo === "enviar" ? `${BASE[portal]}/enviadas` : BASE[portal]);
    } finally {
      setOcupado(null);
    }
  }

  return {
    ocupado,
    error,
    guardar: (c: Cuerpo) => correr("guardar", c),
    enviar: (c: Cuerpo, aprobadorId?: string) => correr("enviar", c, aprobadorId),
  };
}
