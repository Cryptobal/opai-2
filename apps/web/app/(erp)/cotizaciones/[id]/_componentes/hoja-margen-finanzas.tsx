"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Segmentado, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

import { MargenInstrumentos } from "./margen-instrumentos";
import {
  entradaParametros,
  type EstadoMargen,
  estadoInicialMargen,
  hayCambios,
  MARGEN_MAXIMO,
  MODOS_MARGEN,
  mesesValidos,
  type ParametrosVersion,
  PASO_MARGEN,
  pctTexto,
} from "./margen-form";

type Previa = { ventaMensualClp: number | null };

/** Hoja «Margen y finanzas» (CPQ v4): margen, modo, instrumentos y meses de contrato por versión, con vista previa. */
export function HojaMargenFinanzas({
  versionId,
  parametros,
  ventaActual,
  onCerrar,
  onListo,
}: {
  versionId: string;
  parametros: ParametrosVersion;
  ventaActual: number | null;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [e, setE] = useState<EstadoMargen>(() => estadoInicialMargen(parametros));
  const [res, setRes] = useState<{ clave: string; venta: number | null; fallo: boolean } | null>(null);
  const turno = useRef(0);
  const set = (c: Partial<EstadoMargen>) => setE((p) => ({ ...p, ...c }));
  const mesesOk = mesesValidos(e.meses) !== null;
  const cambios = hayCambios(e, parametros);
  const clave = cambios && mesesOk ? JSON.stringify(entradaParametros(versionId, e)) : null;
  // La vista previa solo vale para el estado que la pidió; si cambias algo, vuelve a «venta actual».
  const vigente = clave !== null && res?.clave === clave ? res : null;

  useEffect(() => {
    if (clave === null) return;
    const mio = ++turno.current;
    const espera = setTimeout(() => {
      void ejecutar<Previa>("cpq.versiones.parametros", JSON.parse(clave), true, "ninguna").then((r) => {
        if (turno.current === mio) setRes({ clave, venta: r?.ventaMensualClp ?? null, fallo: r === null });
      });
    }, 350);
    return () => clearTimeout(espera);
  }, [clave, ejecutar]);

  async function guardar() {
    const r = await ejecutar("cpq.versiones.parametros", entradaParametros(versionId, e));
    if (r != null) {
      avisar.exito("Margen y finanzas actualizados");
      onListo();
      onCerrar();
    }
  }

  const venta = vigente && !vigente.fallo ? vigente.venta : ventaActual;
  const fallo = Boolean(vigente?.fallo);
  return (
    <Sheet
      abierto
      titulo="Margen y finanzas"
      onCerrar={onCerrar}
      acciones={
        <>
          <div className="mr-auto min-w-0 text-left md:self-center">
            <p className="t-subheading t-numeric">{venta != null ? `${pesos(venta)} / mes` : "—"}</p>
            <p className="t-caption text-fg-muted">{vigente && !vigente.fallo ? "Con tus cambios" : "Venta mensual actual"}</p>
          </div>
          <Button type="button" disabled={pendiente || !mesesOk} onClick={() => (cambios ? void guardar() : onCerrar())}>
            Listo
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" aria-label="Bajar el margen" disabled={e.margenPct <= 0} onClick={() => set({ margenPct: Math.max(0, e.margenPct - PASO_MARGEN) })}>
            <Minus className="size-4" aria-hidden />
          </Button>
          <p className="t-heading t-numeric" aria-live="polite">{pctTexto(e.margenPct)}</p>
          <Button type="button" variant="secondary" aria-label="Subir el margen" disabled={e.margenPct >= MARGEN_MAXIMO} onClick={() => set({ margenPct: Math.min(MARGEN_MAXIMO, e.margenPct + PASO_MARGEN) })}>
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
        <Segmentado
          etiqueta="Base del margen"
          activa={e.modo}
          opciones={MODOS_MARGEN.map((m) => ({ id: m.id, etiqueta: m.etiqueta, onClick: () => set({ modo: m.id }) }))}
        />
        <MargenInstrumentos e={e} p={parametros} set={set} deshabilitado={pendiente} />
        <Campo etiqueta="Meses de contrato" htmlFor="cpq-meses" error={mesesOk ? undefined : "Entre 1 y 120 meses."}>
          <Input id="cpq-meses" inputMode="numeric" value={e.meses} onChange={(x) => set({ meses: x.target.value.replace(/\D/g, "") })} />
        </Campo>
        {fallo && error ? <Alerta tono="danger" titulo="No se pudo calcular la vista previa">{error}</Alerta> : null}
        {!fallo && error ? <Alerta tono="danger" titulo={error} /> : null}
      </div>
    </Sheet>
  );
}
