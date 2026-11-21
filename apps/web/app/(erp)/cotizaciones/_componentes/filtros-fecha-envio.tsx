"use client";

import { InputFecha } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";

/** Rango de fechas de envío de la cotización (`?desde=` / `?hasta=`). */
export function FiltrosFechaEnvio() {
  const { valor, fijar } = useParametros();
  const desde = valor("desde") ?? "";
  const hasta = valor("hasta") ?? "";
  const pagina = { cursor: null, prev: null };
  const cambiar = (clave: "desde" | "hasta", valor: string) => {
    if ((valor || "") === (clave === "desde" ? desde : hasta)) return;
    fijar({ [clave]: valor || null, ...pagina });
  };
  return (
    <div className="flex flex-wrap items-end gap-2">
      <InputFecha aria-label="Enviada desde" valor={desde} onCambiar={(v) => cambiar("desde", v)} />
      <InputFecha
        aria-label="Enviada hasta"
        valor={hasta}
        onCambiar={(v) => cambiar("hasta", v)}
        invalido={Boolean(desde && hasta && hasta < desde)}
      />
    </div>
  );
}