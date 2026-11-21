"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { ModulosTerreno } from "./secciones-terreno";

type Turno = {
  personaId: string;
  nombre: string;
  iniciales: string;
  inicio: string;
  fin: string;
  estado: "en_curso" | "proximo" | "terminado";
};

export type ContextoTerrenoEquipo = {
  instalacion: { nombre: string };
  turnos: Turno[];
  modulos: ModulosTerreno;
};

type Estado = {
  datos: ContextoTerrenoEquipo | null;
  falla: boolean;
  recargar: () => void;
};

const Ctx = createContext<Estado | null>(null);

/** Contexto del equipo (instalación, turnos y módulos activos); una sola lectura compartida por el inicio y la barra. */
export function ProveedorContextoTerreno({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<ContextoTerrenoEquipo | null>(null);
  const [falla, setFalla] = useState(false);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/terreno/contexto", { cache: "no-store", credentials: "same-origin" })
      .then((r) =>
        r.ok ? (r.json() as Promise<ContextoTerrenoEquipo>) : Promise.reject(new Error(String(r.status))),
      )
      .then((x) => {
        if (!vivo) return;
        setDatos(x);
        setFalla(false);
      })
      .catch(() => vivo && setFalla(true));
    return () => {
      vivo = false;
    };
  }, [version]);

  useEffect(() => {
    const cada = window.setInterval(recargar, 60_000);
    const alVolver = () => {
      if (document.visibilityState === "visible") recargar();
    };
    window.addEventListener("online", recargar);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(cada);
      window.removeEventListener("online", recargar);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [recargar]);

  const valor = useMemo(() => ({ datos, falla, recargar }), [datos, falla, recargar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useContextoTerreno() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useContextoTerreno fuera de ProveedorContextoTerreno");
  return v;
}