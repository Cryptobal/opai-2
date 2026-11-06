"use client";
import { useState } from "react";
import { Alerta, avisar, Button, Campo, Input, InputFecha, Select, Sheet } from "@opai/ds";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import {
  cambiosDe,
  type CampoLaboral,
  faltantes,
  SECCIONES_LABORAL,
  type SeccionLaboral,
} from "./config-hojas-laboral";

type Props = {
  seccion: SeccionLaboral;
  personaId: string;
  /** Valores actuales como texto; `si`/`no` para los booleanos. */
  inicial: Record<string, string>;
  /** Mensaje que impide guardar (p. ej. ya hay una solicitud pendiente). */
  bloqueo?: string;
};

function Entrada({ c, valor, onCambiar }: { c: CampoLaboral; valor: string; onCambiar: (v: string) => void }) {
  const id = `laboral-${c.clave}`;
  return (
    <Campo etiqueta={c.etiqueta} htmlFor={id}>
      {c.tipo === "fecha" ? (
        <InputFecha id={id} valor={valor} onCambiar={onCambiar} />
      ) : c.tipo === "si_no" ? (
        <Select
          id={id}
          valor={valor || "no"}
          onCambiar={onCambiar}
          opciones={[
            { valor: "no", etiqueta: "No" },
            { valor: "si", etiqueta: "Sí" },
          ]}
        />
      ) : (
        <Input
          id={id}
          value={valor}
          maxLength={c.max}
          inputMode={c.tipo === "entero" ? "numeric" : undefined}
          onChange={(e) => onCambiar(e.target.value)}
        />
      )}
    </Campo>
  );
}

/** Hoja de edición de una sección de Laboral: llama a la capacidad de escritura de esa sección. */
export function HojaLaboral({ seccion, personaId, inicial, bloqueo }: Props) {
  const cfg = SECCIONES_LABORAL[seccion];
  const hoja = useHojaUrl(cfg.param);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [v, setV] = useState<Record<string, string>>(inicial);
  const cambios = cambiosDe(cfg, inicial, v);
  const sinCambios = Object.keys(cambios).length === 0;
  const invalido = faltantes(cfg, v);
  async function guardar() {
    const input = cfg.armar(personaId, cambios);
    // Ids literales: el gate de paridad exige ver qué capacidad invoca la pantalla.
    const r = await ejecutar(
      seccion === "pago"
        ? "core.personas.pago_solicitar_cambio"
        : seccion === "prevision"
          ? "core.personas.prevision_actualizar"
          : "core.personas.laboral_actualizar",
      input,
    );
    if (!r) return;
    avisar.exito(cfg.exito);
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={cfg.titulo}
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" disabled={pendiente} onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || invalido || sinCambios || Boolean(bloqueo)}
            onClick={() => void guardar()}
          >
            {pendiente ? "Guardando…" : cfg.boton}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4" aria-busy={pendiente}>
        {bloqueo ? <Alerta tono="warning" titulo={bloqueo} /> : null}
        {error ? (
          <Alerta tono="danger" titulo="No se pudo guardar">
            {error} Revisa los datos e intenta nuevamente.
          </Alerta>
        ) : null}
        <fieldset disabled={pendiente || Boolean(bloqueo)} className="flex flex-col gap-3.5">
          {cfg.campos.map((c) => (
            <Entrada
              key={c.clave}
              c={c}
              valor={v[c.clave] ?? ""}
              onCambiar={(x) => setV((a) => ({ ...a, [c.clave]: x }))}
            />
          ))}
        </fieldset>
      </div>
    </Sheet>
  );
}
