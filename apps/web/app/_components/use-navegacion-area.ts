"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AreaNav } from "@opai/domain";
import { avisar } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

export type Fijado = {
  tipo: "entrada" | "ficha";
  href: string;
  etiqueta: string;
  fijadoEn: string;
};
type Preferencias = {
  areaPrincipal: AreaNav | null;
  areaAbierta: AreaNav | "ninguna" | null;
  fijados: Fijado[];
};
const VACIAS: Preferencias = { areaPrincipal: null, areaAbierta: null, fijados: [] };
type Campo = { clave: string; valor: unknown; version?: number };

/** Una carga por montaje/empresa, no por navegación. Escrituras seriales, CAS y errores visibles. */
export function useNavegacionArea(portal: string, activo: boolean) {
  const [prefs, setPrefs] = useState<Preferencias>(VACIAS);
  const actual = useRef(VACIAS);
  const versiones = useRef<Record<string, number>>({});
  const cola = useRef(Promise.resolve());
  const [cargado, setCargado] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const cargar = useCallback(async () => {
    setErrorCarga(false);
    const r = await ejecutarCapacidad(portal, "core.config.get", { modulo: "core" }).catch(() => ({ ok: false } as const));
    if (!r.ok) { setErrorCarga(true); return false; }
    const datos = r.data as Campo[];
    const de = (c: string) => datos.find((d) => d.clave === c)?.valor;
    versiones.current = Object.fromEntries(datos.map((d) => [d.clave, d.version ?? 0]));
    const p = {
      areaPrincipal: (de("navegacion_area_principal") as AreaNav | null) ?? null,
      areaAbierta: (de("navegacion_area_abierta") as AreaNav | "ninguna" | null) ?? null,
      fijados: (de("navegacion_fijados") as Fijado[] | undefined) ?? [],
    };
    actual.current = p;
    setPrefs(p);
    setCargado(true);
    return true;
  }, [portal]);
  useEffect(() => {
    if (!activo) return;
    void Promise.resolve().then(cargar);
    window.addEventListener("opai-preferencias-nav", cargar);
    return () => window.removeEventListener("opai-preferencias-nav", cargar);
  }, [activo, cargar]);

  const cambiar = useCallback(
    (clave: string, transformar: (p: Preferencias) => Preferencias | Promise<Preferencias>) => {
      cola.current = cola.current
        .then(async () => {
          if (!cargado && !(await cargar())) {
            avisar.error(clave === "navegacion_fijados" ? "No se pudo fijar. Reintenta." : "No se pudieron cargar las preferencias. Reintenta.");
            return;
          }
          const revision = versiones.current[clave] ?? 0;
          const siguiente = await transformar(actual.current);
          if ((versiones.current[clave] ?? 0) !== revision) {
            avisar.info("Preferencias actualizadas. Reintenta.");
            return;
          }
          const campo =
            clave === "navegacion_fijados"
              ? "fijados"
              : clave === "navegacion_area_abierta"
                 ? "areaAbierta"
                 : "areaPrincipal";
          // La cola compara con el último valor confirmado, no con el render que la encoló.
          if (Object.is(siguiente[campo], actual.current[campo])) return;
          const r = await ejecutarCapacidad(portal, "core.config.set", {
            modulo: "core",
            clave,
            valor: siguiente[campo],
            versionEsperada: revision,
          });
          if (!r.ok) {
            avisar.error("No se guardó la preferencia. Recarga e inténtalo de nuevo.");
            await cargar();
            return;
          }
          if ((versiones.current[clave] ?? 0) !== revision) { await cargar(); return; }
          versiones.current[clave] = (r.data as { version: number }).version;
          actual.current = { ...actual.current, [campo]: siguiente[campo] };
          setPrefs(actual.current);
          if (clave === "navegacion_area_principal")
            window.dispatchEvent(new Event("opai-preferencias-nav"));
        })
        .catch(() => {
          avisar.error("No se guardó la preferencia.");
        });
    },
    [cargado, cargar, portal],
  );

  const fijarAreaAbierta = (area: AreaNav | null) =>
    cambiar("navegacion_area_abierta", (p) => ({ ...p, areaAbierta: area ?? "ninguna" }));
  const elegirAreaPrincipal = (area: AreaNav | null) =>
    cambiar("navegacion_area_principal", (p) => ({ ...p, areaPrincipal: area }));
  const fijar = (item: Omit<Fijado, "fijadoEn">, permitidos?: readonly string[]) =>
    cambiar("navegacion_fijados", async (previo) => {
      const { revisarFichasNav } = await import("@/app/_acciones/validar-fichas-nav");
      const { invalidas } = await revisarFichasNav(previo.fijados.filter((f) => f.tipo === "ficha").map((f) => f.href));
      const p = {
        ...previo,
        fijados: permitidos
          ? previo.fijados.filter((f) => f.tipo === "ficha" ? !invalidas.includes(f.href) : permitidos.includes(f.href))
          : previo.fijados.filter((f) => !invalidas.includes(f.href)),
      };
      if (p.fijados.some((f) => f.href === item.href))
        return { ...p, fijados: p.fijados.filter((f) => f.href !== item.href) };
      if (p.fijados.length >= 5) {
        avisar.info("Ya tienes cinco fijados. Desfija uno para agregar otro.");
        return p;
      }
      return { ...p, fijados: [...p.fijados, { ...item, fijadoEn: new Date().toISOString() }] };
    });
  const desfijar = (href: string) =>
    cambiar("navegacion_fijados", (p) => ({
      ...p,
      fijados: p.fijados.filter((f) => f.href !== href),
    }));
  return { ...prefs, cargado, errorCarga, reintentar: cargar, fijarAreaAbierta, elegirAreaPrincipal, fijar, desfijar };
}
