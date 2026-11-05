"use client";

import { useCallback, useEffect, useState } from "react";

import { avisar, Campo, ChipToggle } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fecha } from "@/lib/fechas";

type Plan = { id: string; nombre: string; disparador: string; porDefecto: boolean; activo: boolean };
type Vista = { pasos: { programadoEn: string }[] };
type Vivo = { estado: string; pasos: { estado: string }[] } | null;

const PENDIENTES = ["programado", "por_hacer", "por_preparar", "fallido"];

/**
 * Seguimiento al enviar la cotización (CAR-67, R4): ofrece iniciar el plan por defecto del negocio.
 * Sin permiso de Comercial, sin plan o sin negocio abierto, la opción no aparece y se envía como siempre.
 */
export function useSeguimientoAlEnviar(negocioId: string | null) {
  const { ejecutar } = useCapacidad("erp");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);
  const [cancelaN, setCancelaN] = useState(0);
  const [iniciar, setIniciar] = useState(true);
  const [reemplaza, setReemplaza] = useState(false);

  useEffect(() => {
    if (!negocioId) return;
    void (async () => {
      const planes = await ejecutar<Plan[]>("comercial.seguimiento_planes.list", {}, false, "ninguna");
      const p = Array.isArray(planes)
        ? planes.find((x) => x.activo && x.porDefecto && x.disparador === "cotizacion_enviada")
        : undefined;
      if (!p) return;
      const vivo = await ejecutar<Vivo>("comercial.seguimientos.get", { negocioId }, false, "ninguna");
      const hayVivo = Boolean(vivo && (vivo.estado === "activo" || vivo.estado === "pausado"));
      const previa = await ejecutar<Vista>(
        "comercial.seguimientos.iniciar",
        { negocioId, planId: p.id, reemplazar: hayVivo },
        true,
        "ninguna",
      );
      if (!previa) return; // negocio cerrado o sin permiso: no se ofrece
      setReemplaza(hayVivo);
      setCancelaN(hayVivo ? (vivo?.pasos.filter((x) => PENDIENTES.includes(x.estado)).length ?? 0) : 0);
      setVista(previa);
      setPlan(p);
    })();
  }, [negocioId, ejecutar]);

  const arrancar = useCallback(
    async (cotizacionId: string, codigo: string) => {
      if (!plan || !negocioId || !iniciar) return;
      const r = await ejecutar(
        "comercial.seguimientos.iniciar",
        { negocioId, planId: plan.id, cotizacionId, cotizacionCodigo: codigo, reemplazar: reemplaza },
      );
      if (r) avisar.exito("Seguimiento iniciado");
      else avisar.error("La cotización salió, pero no se pudo iniciar el seguimiento. Inícialo desde el negocio.");
    },
    [plan, negocioId, iniciar, reemplaza, ejecutar],
  );

  return { disponible: Boolean(plan), plan, vista, cancelaN, iniciar, setIniciar, reemplaza, arrancar };
}

export function OpcionSeguimiento(p: { s: ReturnType<typeof useSeguimientoAlEnviar> }) {
  const { plan, vista, cancelaN, iniciar, setIniciar, reemplaza } = p.s;
  if (!plan || !vista) return null;
  const primero = vista.pasos[0]?.programadoEn;
  return (
    <Campo etiqueta="Seguimiento">
      <div className="flex flex-wrap gap-2">
        <ChipToggle etiqueta={`Iniciar «${plan.nombre}»`} activo={iniciar} onCambiar={setIniciar} />
        <ChipToggle etiqueta="Solo enviar" activo={!iniciar} onCambiar={(a) => setIniciar(!a)} />
      </div>
      <p className="t-caption mt-1">
        {iniciar
          ? `${vista.pasos.length} pasos en días hábiles${primero ? ` · el primero el ${fecha(primero)}` : ""}.${
              reemplaza ? ` Reemplaza el seguimiento en curso: ${cancelaN} ${cancelaN === 1 ? "paso pendiente se cancela" : "pasos pendientes se cancelan"}.` : ""
            }`
          : "No se agenda ningún paso: el negocio queda sin seguimiento automático."}
      </p>
    </Campo>
  );
}
