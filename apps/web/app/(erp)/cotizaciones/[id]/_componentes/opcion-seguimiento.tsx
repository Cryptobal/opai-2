"use client";

import { useCallback, useEffect, useState } from "react";

import { avisar, Campo, ChipToggle, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fecha } from "@/lib/fechas";

type Plan = { id: string; nombre: string; disparador: string; porDefecto: boolean; activo: boolean };
type Opcion = "iniciar" | "mover_sin_seguimiento" | "solo_enviar";
type Decision = {
  pasosCancelados: number;
  etapasAbiertas: { id: string; nombre: string; actual: boolean }[];
  seguimiento: { pasos: { programadoEn: string }[] } | null;
};

const pasosTexto = (n: number) => `${n} ${n === 1 ? "paso pendiente se cancela" : "pasos pendientes se cancelan"}`;

/**
 * Seguimiento al enviar la cotización (R4, piso de 1.0; CAR-67 y CAR-160): iniciar el plan por defecto,
 * mover el negocio a una etapa abierta sin seguimiento (la elige la persona; no hay etapa por defecto)
 * o solo enviar. Pantalla y MCP usan la misma capacidad y el mismo parámetro `opcion`. Sin permiso de
 * Comercial o sin negocio abierto, la opción no aparece y se envía como siempre.
 */
export function useSeguimientoAlEnviar(negocioId: string | null) {
  const { ejecutar } = useCapacidad("erp");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [mover, setMover] = useState<Decision | null>(null);
  const [inicio, setInicio] = useState<Decision | null>(null);
  const [opcion, setOpcion] = useState<Opcion>("solo_enviar");
  const [etapaId, setEtapaId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!negocioId) return;
    void (async () => {
      // Vista previa de «mover»: etapas abiertas y cuántos pasos pendientes se cancelarían.
      const m = await ejecutar<Decision>("comercial.seguimientos.decidir_envio", { negocioId, opcion: "mover_sin_seguimiento" }, true, "ninguna");
      if (!m) return; // negocio cerrado o sin permiso: no se ofrece
      setMover(m);
      const planes = await ejecutar<Plan[]>("comercial.seguimiento_planes.list", {}, false, "ninguna");
      const p = Array.isArray(planes) ? planes.find((x) => x.activo && x.porDefecto && x.disparador === "cotizacion_enviada") : undefined;
      if (!p) return;
      const i = await ejecutar<Decision>("comercial.seguimientos.decidir_envio", { negocioId, opcion: "iniciar", planId: p.id }, true, "ninguna");
      if (!i) return;
      setInicio(i);
      setPlan(p);
      setOpcion("iniciar");
    })();
  }, [negocioId, ejecutar]);

  const arrancar = useCallback(
    async (cotizacionId: string, codigo: string) => {
      if (!mover || !negocioId) return;
      const r = await ejecutar("comercial.seguimientos.decidir_envio", {
        negocioId, opcion, cotizacionId, cotizacionCodigo: codigo,
        ...(opcion === "iniciar" && plan ? { planId: plan.id } : {}),
        ...(opcion === "mover_sin_seguimiento" && etapaId ? { etapaId } : {}),
      });
      if (r && opcion === "iniciar") avisar.exito("Seguimiento iniciado");
      else if (r && opcion === "mover_sin_seguimiento") avisar.exito("Negocio movido sin seguimiento");
      else if (!r) avisar.error("La cotización salió, pero no se aplicó la opción de seguimiento. Revísala desde el negocio.");
    },
    [mover, negocioId, opcion, plan, etapaId, ejecutar],
  );

  // Mover sin seguimiento exige elegir la etapa antes de enviar.
  const listo = opcion !== "mover_sin_seguimiento" || Boolean(etapaId);
  return { disponible: Boolean(mover), plan, mover, inicio, opcion, setOpcion, etapaId, setEtapaId, listo, arrancar };
}

export function OpcionSeguimiento(p: { s: ReturnType<typeof useSeguimientoAlEnviar> }) {
  const { plan, mover, inicio, opcion, setOpcion, etapaId, setEtapaId } = p.s;
  if (!mover) return null;
  const cancela = mover.pasosCancelados;
  const pasos = inicio?.seguimiento?.pasos ?? [];
  const primero = pasos[0]?.programadoEn;
  return (
    <Campo etiqueta="Seguimiento">
      <div className="flex flex-wrap gap-2">
        {plan && inicio ? (
          <ChipToggle etiqueta={`Iniciar «${plan.nombre}»`} activo={opcion === "iniciar"} onCambiar={(a) => a && setOpcion("iniciar")} />
        ) : null}
        <ChipToggle etiqueta="Mover sin seguimiento" activo={opcion === "mover_sin_seguimiento"} onCambiar={(a) => a && setOpcion("mover_sin_seguimiento")} />
        <ChipToggle etiqueta="Solo enviar" activo={opcion === "solo_enviar"} onCambiar={(a) => a && setOpcion("solo_enviar")} />
      </div>
      {opcion === "mover_sin_seguimiento" ? (
        <div className="mt-2">
          <Select
            aria-label="Etapa a la que pasa el negocio"
            valor={etapaId}
            onCambiar={setEtapaId}
            placeholder="Elige la etapa"
            invalido={!etapaId}
            opciones={mover.etapasAbiertas.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
          />
        </div>
      ) : null}
      <p className="t-caption mt-1">
        {opcion === "iniciar"
          ? `${pasos.length} pasos en días hábiles${primero ? ` · el primero el ${fecha(primero)}` : ""}.${cancela ? ` Reemplaza el seguimiento en curso: ${pasosTexto(cancela)}.` : ""}`
          : opcion === "mover_sin_seguimiento"
            ? `Sin seguimiento automático: el negocio pasa a la etapa que elijas (si ya está más adelante, no baja).${cancela ? ` ${pasosTexto(cancela)}.` : ""}`
            : "Solo se envía: no cambia el seguimiento ni la etapa del negocio."}
      </p>
    </Campo>
  );
}
