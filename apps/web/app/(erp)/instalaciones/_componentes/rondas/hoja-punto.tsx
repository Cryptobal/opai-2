"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { CamposPunto } from "./campos-punto";
import { type DatosPunto, inicialPunto, puntoAInput } from "./hoja-punto-datos";
import type { DefectosRondas, Punto } from "./tipos";

/** Nuevo o editar punto de control (c13pd) en Sheet, abierto por `?punto=nuevo|<id>`. */
export function HojaPunto({
  instalacionId,
  puntos,
  defectos,
}: {
  instalacionId: string;
  puntos: readonly Punto[];
  defectos: DefectosRondas;
}) {
  const hoja = useHojaUrl("punto");
  if (!hoja.abierta) return null;
  const actual = puntos.find((p) => p.id === hoja.valor) ?? null;
  return (
    <Formulario
      key={hoja.valor ?? "nuevo"}
      instalacionId={instalacionId}
      actual={actual}
      defectos={defectos}
      onCerrar={hoja.cerrar}
    />
  );
}

function Formulario({
  instalacionId,
  actual,
  defectos,
  onCerrar,
}: {
  instalacionId: string;
  actual: Punto | null;
  defectos: DefectosRondas;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [d, setD] = useState<DatosPunto>(() => inicialPunto(actual, defectos));
  const [confirmar, setConfirmar] = useState(false);
  const editar = actual !== null;

  async function guardar() {
    const input = puntoAInput(d, instalacionId, actual?.id ?? null);
    const r = editar
      ? await ejecutar("rondas.puntos.actualizar", input)
      : await ejecutar("rondas.puntos.crear", input);
    if (r) {
      avisar.exito(editar ? "Punto actualizado" : "Punto creado");
      onCerrar();
    }
  }

  async function archivar() {
    if (await ejecutar("rondas.puntos.archivar", { id: actual?.id })) {
      avisar.exito("Punto archivado");
      setConfirmar(false);
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={editar ? `Editar punto · ${actual.nombre}` : "Nuevo punto"}
      descripcion="Los valores en blanco heredan los del tenant (Configuración → Rondas)."
      acciones={
        <>
          {editar && actual.estado === "activo" ? (
            <Button variant="ghost" onClick={() => setConfirmar(true)}>
              Archivar
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} cargando={pendiente} disabled={d.nombre.trim().length < 2}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposPunto d={d} setD={setD} defectos={defectos} />
      </div>
      {confirmar ? (
        <DialogoConfirmar
          confirmacion={{
            titulo: `Archivar ${actual?.nombre}`,
            descripcion:
              "El punto deja de ofrecerse en plantillas nuevas. Las rondas pasadas lo conservan.",
            boton: "Archivar",
            peligro: true,
          }}
          pendiente={pendiente}
          error={error}
          onCerrar={() => setConfirmar(false)}
          onConfirmar={archivar}
        />
      ) : null}
    </Sheet>
  );
}
