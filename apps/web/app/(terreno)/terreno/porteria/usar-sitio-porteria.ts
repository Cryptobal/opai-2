"use client";

import { useCallback, useEffect, useState } from "react";

import type { ConfigAcceso } from "@opai/domain/acceso-config";

import {
  guardarEvacuacion,
  leerEvacuacion,
  type SnapshotEvacuacion,
} from "@/lib/terreno/evacuacion";
import { instantanea, suscribir } from "@/lib/terreno/estado";

import type { Bienvenida } from "./bienvenida-porteria";
import type { EnSitio } from "./lista-en-sitio";
import type { PuntoPorteria } from "./punto-porteria";

export type SitioPorteria = {
  activo: boolean;
  config: ConfigAcceso | null;
  puntos: PuntoPorteria[];
  bienvenida: Bienvenida | null;
  items: EnSitio[];
};

const sitioDeCopia = (items: EnSitio[]): SitioPorteria => ({
  activo: true,
  config: null,
  puntos: [],
  bienvenida: null,
  items,
});

/** Carga «en sitio» del servidor, copia cifrada offline (R26) y estado de conexión. */
export function usarSitioPorteria() {
  const [sitio, setSitio] = useState<SitioPorteria | null>(null);
  const [copia, setCopia] = useState<SnapshotEvacuacion | null>(null);
  const [sinRed, setSinRed] = useState(false);
  const [falla, setFalla] = useState(false);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  const [enLinea, setEnLinea] = useState(true);

  useEffect(() => suscribir(() => setEnLinea(instantanea().enLinea)), []);

  useEffect(() => {
    void leerEvacuacion().then(setCopia);
  }, [version]);

  useEffect(() => {
    let vivo = true;
    const usarCopia = (snap: SnapshotEvacuacion) => {
      setSitio(sitioDeCopia(snap.items));
      setSinRed(true);
      setFalla(false);
    };
    fetch("/api/terreno/porteria/sitio", { cache: "no-store", credentials: "same-origin" })
      .then((r) =>
        r.ok ? (r.json() as Promise<SitioPorteria>) : Promise.reject(new Error(String(r.status))),
      )
      .then(async (x) => {
        if (!vivo) return;
        setSitio(x);
        setSinRed(false);
        setFalla(false);
        if (x.activo) {
          await guardarEvacuacion(x.items);
          const snap = await leerEvacuacion();
          if (vivo) setCopia(snap);
        }
      })
      .catch(() => {
        if (!vivo) return;
        setFalla(true);
        void leerEvacuacion().then((snap) => {
          if (!vivo) return;
          if (snap?.items.length) usarCopia(snap);
          else setSinRed(false);
        });
      });
    return () => {
      vivo = false;
    };
  }, [version]);

  useEffect(() => {
    if (enLinea) {
      const cada = window.setInterval(recargar, 30_000);
      const alVolver = () => recargar();
      window.addEventListener("online", alVolver);
      return () => {
        window.clearInterval(cada);
        window.removeEventListener("online", alVolver);
      };
    }
    void leerEvacuacion().then((snap) => {
      if (snap?.items.length) {
        setSitio(sitioDeCopia(snap.items));
        setSinRed(true);
        setCopia(snap);
      }
    });
    return undefined;
  }, [enLinea, recargar]);

  return { sitio, copia, sinRed, falla, enLinea, recargar };
}