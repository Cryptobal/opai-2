"use client";

import { Clock } from "lucide-react";
import { type ReactNode, useState } from "react";

import { instanteEnZona, posponerTarea } from "@opai/domain";
import {
  avisar,
  Button,
  Campo,
  Dialog,
  InputFecha,
  Menu,
  TareaFila,
  type TonoVencimientoTarea,
} from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

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
  const [dia, setDia] = useState("");
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
      <Dialog
        abierto={eligiendo}
        onCerrar={() => setEligiendo(false)}
        titulo="Posponer tarea"
        descripcion={p.titulo}
        acciones={
          <>
            <Button variant="secondary" onClick={() => setEligiendo(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!dia || pendiente}
              onClick={() => void posponer(instanteEnZona(dia, "09:00"))}
            >
              Posponer
            </Button>
          </>
        }
      >
        <Campo etiqueta="Nueva fecha" htmlFor={`posponer-${p.id}`}>
          <InputFecha id={`posponer-${p.id}`} valor={dia} onCambiar={setDia} />
        </Campo>
      </Dialog>
    </>
  );
}
