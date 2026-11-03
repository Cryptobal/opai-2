"use client";

import { Clock } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode, useState } from "react";

import { posponerTarea } from "@opai/domain";
import { avisar, Menu, TareaFila, type TonoVencimientoTarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

// El selector de fecha solo se carga si se elige «Elegir fecha» (ADR-037).
const PosponerFecha = dynamic(() => import("./posponer-fecha").then((m) => m.PosponerFecha));

type Props = {
  id: string;
  titulo: string;
  vencimiento: string | null;
  texto: string;
  tono: TonoVencimientoTarea;
  prioridad?: string | undefined;
  responsables: string[];
  vinculo?: ReactNode;
  /** Sin permiso de gestionar: solo lectura. */
  gestiona: boolean;
};

/** TareaFila conectada: marcar hecha (`core.actividades.completar`) y posponer (`…update`). */
export function TareaConAcciones(p: Props) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [hecha, setHecha] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  async function completar() {
    setHecha(true);
    const r = await ejecutar("core.actividades.completar", { id: p.id });
    if (!r) setHecha(false);
    else avisar.exito("Tarea hecha");
  }
  async function posponer(vencimiento: string) {
    const r = await ejecutar("core.actividades.update", { id: p.id, vencimiento });
    if (r) avisar.exito("Tarea pospuesta");
    setEligiendo(false);
  }
  const opcion = (o: "manana" | "tres_dias") => () =>
    void posponer(posponerTarea(p.vencimiento, o, new Date()));
  return (
    <>
      <TareaFila
        titulo={p.titulo}
        vencimiento={p.texto}
        tono={p.tono}
        prioridad={p.prioridad}
        responsables={p.responsables}
        vinculo={p.vinculo}
        hecha={hecha}
        deshabilitada={pendiente}
        {...(p.gestiona ? { onMarcar: (v: boolean) => v && void completar() } : {})}
        acciones={
          p.gestiona ? (
            <Menu
              etiqueta={`Posponer «${p.titulo}»`}
              disparador={<Clock className="size-4" aria-hidden />}
              items={[
                { id: "m", etiqueta: "Mañana", onSelect: opcion("manana") },
                { id: "t", etiqueta: "En 3 días", onSelect: opcion("tres_dias") },
                { id: "e", etiqueta: "Elegir fecha", onSelect: () => setEligiendo(true) },
              ]}
            />
          ) : null
        }
      />
      {eligiendo ? (
        <PosponerFecha
          titulo={p.titulo}
          id={p.id}
          pendiente={pendiente}
          onCerrar={() => setEligiendo(false)}
          onPosponer={(v) => void posponer(v)}
        />
      ) : null}
    </>
  );
}
