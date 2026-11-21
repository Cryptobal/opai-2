"use client";

import { useRef, useState } from "react";

import type { MarcaListo } from "@/app/_components/asistencia/marcar-resultado";
import { ubicacion } from "@/app/_components/asistencia/etiquetas";

import { marcarPorEnlacePublico } from "./acciones";

export function useMarcacionPublica(codigo: string) {
  const [paso, setPaso] = useState<"rut" | "pin">("rut");
  const [rut, setRut] = useState("");
  const [pin, setPin] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<MarcaListo | null>(null);
  const clave = useRef(crypto.randomUUID());

  async function marcar() {
    setPendiente(true);
    setError(null);
    const ub = await ubicacion();
    const r = await marcarPorEnlacePublico(codigo, {
      rut,
      pin,
      claveDispositivo: clave.current,
      ...(ub ?? {}),
    });
    setPendiente(false);
    if (!r.ok) {
      setError(r.error.message);
      setPin("");
      return;
    }
    setListo((r.data as { marca: MarcaListo }).marca);
  }

  const cambiarRut = () => {
    setPaso("rut");
    setPin("");
    setError(null);
  };

  return {
    paso, setPaso, rut, setRut, pin, setPin, pendiente, error, listo, marcar, cambiarRut,
  };
}