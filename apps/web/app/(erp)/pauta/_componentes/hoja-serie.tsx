"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, InputFecha, Select, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { fechaCl } from "./etiquetas";
import type { MesPauta } from "./tipos";

/** P02: serie del puesto (patrón, inicio de ciclo y titular). No modifica días pasados. */
export function HojaSerie({ mes, puedeEditar }: { mes: MesPauta; puedeEditar: boolean }) {
  const hoja = useHojaUrl("serie");
  if (!hoja.abierta || !hoja.valor) return null;
  const puesto = mes.puestos.find((p) => p.id === hoja.valor);
  if (!puesto) return null;
  return <Formulario key={puesto.id} mes={mes} puestoId={puesto.id} puedeEditar={puedeEditar} onCerrar={hoja.cerrar} />;
}

function Formulario({
  mes,
  puestoId,
  puedeEditar,
  onCerrar,
}: {
  mes: MesPauta;
  puestoId: string;
  puedeEditar: boolean;
  onCerrar: () => void;
}) {
  const puesto = mes.puestos.find((p) => p.id === puestoId)!;
  const actual = puesto.serie;
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [patronId, setPatronId] = useState(actual?.patronId ?? mes.patrones[0]?.id ?? "");
  const [inicio, setInicio] = useState(actual?.inicioCiclo ?? mes.hoy);
  const [titular, setTitular] = useState(actual?.titularId ?? "ninguno");
  const [desde, setDesde] = useState(mes.hoy);
  const invalido = !patronId || !inicio || !desde;

  async function guardar() {
    const r = await ejecutar("pauta.series.fijar", {
      puestoId,
      patronId,
      inicioCiclo: inicio,
      titularPersonaId: titular === "ninguno" ? null : titular,
      desde,
    });
    if (r) {
      avisar.exito("Serie guardada");
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={`Serie · ${puesto.nombre}`}
      descripcion={`${puesto.horario}${actual ? ` · vigente desde ${fechaCl(actual.desde)}` : " · sin serie todavía"}`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            {puedeEditar ? "Cancelar" : "Cerrar"}
          </Button>
          {puedeEditar ? (
            <Button onClick={guardar} cargando={pendiente} disabled={invalido}>
              Guardar serie
            </Button>
          ) : null}
        </>
      }
    >
      <fieldset disabled={!puedeEditar} className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Alerta tono="info" titulo="No modifica días pasados">
          El cambio rige desde la fecha que elijas, que no puede ser anterior a hoy si el puesto ya tenía serie.
        </Alerta>
        <Campo etiqueta="Patrón" htmlFor="se-patron">
          <Select
            id="se-patron"
            valor={patronId}
            onCambiar={setPatronId}
            opciones={mes.patrones.map((p) => ({ valor: p.id, etiqueta: p.nombre, descripcion: p.ciclo }))}
          />
        </Campo>
        <Campo etiqueta="Inicio de ciclo" htmlFor="se-inicio" ayuda="Primer día de trabajo de un ciclo; fija la fase del patrón.">
          <InputFecha id="se-inicio" valor={inicio} onCambiar={setInicio} />
        </Campo>
        <Campo etiqueta="Titular" htmlFor="se-titular" ayuda="Personas con vínculo vigente en la instalación. Sin titular, los turnos quedan por cubrir.">
          <Select
            id="se-titular"
            valor={titular}
            onCambiar={setTitular}
            opciones={[{ valor: "ninguno", etiqueta: "Sin titular" }, ...mes.candidatos.map((c) => ({ valor: c.id, etiqueta: c.nombre }))]}
          />
        </Campo>
        <Campo etiqueta="Rige desde" htmlFor="se-desde">
          <InputFecha id="se-desde" valor={desde} onCambiar={setDesde} />
        </Campo>
        {titular !== "ninguno" ? <p className="t-caption">Se avisará al titular del cambio.</p> : null}
      </fieldset>
    </Sheet>
  );
}
