import { useCallback, useEffect, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import type { Aviso } from "@/app/_components/campana";

import { conPlazo } from "./con-plazo";

/** Carga y acciones de la Bandeja; el servidor aplica destinatario, permisos y tenant. */
export function useBandeja() {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [aprobaciones, setAprobaciones] = useState<number | null>(null);
  const [decisiones, setDecisiones] = useState<{ id: string; resumen: string }[]>([]);
  const [error, setError] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);
  // Pasos de seguimiento por hacer: suman al número de la Bandeja (CAR-160). Va al final del estado.
  const [tareasSeguimiento, setTareasSeguimiento] = useState(0);
  const cargar = useCallback(async () => {
    setError(false);
    try {
      // Las dos lecturas van juntas y una acción de servidor que se cuelga o rechaza (corte de red,
      // despliegue nuevo) deja la tarjeta en error, nunca en esqueleto para siempre (B12).
      const [r, c] = await Promise.all([
        conPlazo(
          ejecutarCapacidad("erp", "core.notificaciones.list", { limite: 50, soloNoLeidas: true }),
        ),
        conPlazo(
          ejecutarCapacidad("erp", "core.resumen.contadores", {
            campos: ["aprobacionesPendientes", "tareasSeguimiento"],
          }),
        ),
      ]);
      if (r.ok) {
        const d = r.data as { items: Aviso[]; noLeidas: number };
        setAvisos(d.items.filter((a) => !a.leidaEn));
        setNoLeidas(d.noLeidas);
      } else {
        setAvisos([]);
        setError(true);
      }
      if (c.ok) {
        const datos = c.data as { aprobacionesPendientes: number | null; tareasSeguimiento: number | null };
        const total = datos.aprobacionesPendientes;
        setTareasSeguimiento(datos.tareasSeguimiento ?? 0);
        setAprobaciones(total);
        // null significa sin permiso: no se solicita la lista para viewer/supervisor.
        if (total !== null && total > 0) {
          const [a, cpq] = await Promise.all([
            conPlazo(ejecutarCapacidad("erp", "core.aprobaciones.list", { estado: "pendiente" })),
            conPlazo(ejecutarCapacidad("erp", "cpq.aprobaciones.list", { limite: 5 })),
          ]);
          const agente = a.ok ? (a.data as { id: string; resumen: string }[]) : [];
          const cpqItems = cpq.ok
            ? (cpq.data as { id: string; resumen: string }[]).map((x) => ({
                id: x.id,
                resumen: x.resumen,
              }))
            : [];
          setDecisiones([...agente, ...cpqItems].slice(0, 5));
        } else setDecisiones([]);
      }
    } catch {
      setAvisos((prev) => prev ?? []);
      setError(true);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(cargar);
    const actualizar = () => void cargar();
    window.addEventListener("opai-bandeja", actualizar);
    return () => window.removeEventListener("opai-bandeja", actualizar);
  }, [cargar]);
  async function cargarMas() {
    const ultimo = avisos?.at(-1);
    if (!ultimo || cargandoMas) return;
    setCargandoMas(true);
    try {
      const r = await ejecutarCapacidad("erp", "core.notificaciones.list", {
        limite: 50,
        soloNoLeidas: true,
        antesDe: ultimo.id,
      });
      if (!r.ok) {
        setError(true);
        return;
      }
      const d = r.data as { items: Aviso[]; noLeidas: number };
      setAvisos((prev) => [
        ...(prev ?? []),
        ...d.items.filter((a) => !prev?.some((p) => p.id === a.id)),
      ]);
      setNoLeidas(d.noLeidas);
    } finally {
      setCargandoMas(false);
    }
  }
  async function marcar() {
    const r = await ejecutarCapacidad("erp", "core.notificaciones.marcar_todas", {});
    if (!r.ok) {
      setError(true);
      return;
    }
    await cargar();
    window.dispatchEvent(new Event("opai-bandeja"));
  }
  return {
    avisos,
    aprobaciones,
    tareasSeguimiento,
    decisiones,
    error,
    noLeidas,
    cargandoMas,
    cargar,
    cargarMas,
    marcar,
  };
}
