"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { diaSemana, fechaCl } from "./etiquetas";
import type { MesPauta } from "./tipos";

/** P10: refuerzo en un día (`?refuerzo=puestoId_fecha`). */
export function HojaRefuerzo({ mes, puedeEditar }: { mes: MesPauta; puedeEditar: boolean }) {
  const hoja = useHojaUrl("refuerzo");
  if (!hoja.abierta || !hoja.valor) return null;
  const [puestoId, fecha] = hoja.valor.split("_");
  const puesto = mes.puestos.find((p) => p.id === puestoId);
  if (!puesto || !fecha) return null;
  return (
    <Formulario
      key={hoja.valor}
      mes={mes}
      puestoId={puesto.id}
      puestoNombre={puesto.nombre}
      horario={puesto.horario}
      fecha={fecha}
      puedeEditar={puedeEditar}
      onCerrar={hoja.cerrar}
    />
  );
}

function Formulario({
  mes,
  puestoId,
  puestoNombre,
  horario,
  fecha,
  puedeEditar,
  onCerrar,
}: {
  mes: MesPauta;
  puestoId: string;
  puestoNombre: string;
  horario: string;
  fecha: string;
  puedeEditar: boolean;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [personaId, setPersonaId] = useState(mes.candidatos[0]?.id ?? "");
  const [motivo, setMotivo] = useState("");

  async function agregar() {
    if (await ejecutar("pauta.refuerzos.agregar", { puestoId, fecha, personaId, motivo: motivo.trim() })) {
      avisar.exito("Refuerzo agregado");
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={`Agregar refuerzo · ${puestoNombre}`}
      descripcion={`${diaSemana(fecha)} ${fechaCl(fecha)} · ${horario}`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cerrar
          </Button>
          {puedeEditar ? (
            <Button
              onClick={() => void agregar()}
              cargando={pendiente}
              disabled={!personaId || motivo.trim().length < 3}
            >
              Agregar refuerzo
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {!puedeEditar ? <p className="t-caption">Solo lectura: tu rol no edita la pauta.</p> : null}
        <Campo etiqueta="Guardia" htmlFor="rf-persona">
          <Select
            id="rf-persona"
            valor={personaId}
            onCambiar={setPersonaId}
            opciones={mes.candidatos.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
          />
        </Campo>
        <Campo etiqueta="Motivo" htmlFor="rf-motivo">
          <Input
            id="rf-motivo"
            value={motivo}
            placeholder="Evento, pedido del cliente, contingencia…"
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
        <p className="t-caption text-fg-muted">
          Fuera de la serie del puesto. Quedará como turno extra por aprobar (CAR-96).
        </p>
      </div>
    </Sheet>
  );
}
