"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Combobox, InputFecha, Sheet } from "@opai/ds";

import { useHojaUrl, useParametros } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { Puesto } from "@/lib/tipos-maestros";

import { hoyCl, type PrevisualizacionTitular, type TitularesPuesto } from "./titular-tipos";
import { VistaPreviaTitular } from "./vista-previa-titular";

type Props = { puestos: Puesto[]; subtitulo: string; titulares: TitularesPuesto | null };

/** Asignar o quitar el titular de un puesto (CAR-206), abierto por `?titular=<puesto>` (`&quitar=1`). */
export function HojaTitular({ puestos, subtitulo, titulares }: Props) {
  const hoja = useHojaUrl("titular");
  const { valor } = useParametros();
  const puesto = puestos.find((p) => p.id === hoja.valor);
  if (!hoja.abierta || !puesto || !titulares || titulares.puestoId !== puesto.id) return null;
  return (
    <Formulario
      key={puesto.id}
      puesto={puesto}
      subtitulo={subtitulo}
      titulares={titulares}
      quitar={valor("quitar") === "1"}
      onCerrar={() => {
        const u = new URL(location.href);
        u.searchParams.delete("quitar");
        history.replaceState(null, "", u);
        hoja.cerrar();
      }}
    />
  );
}

function Formulario({
  puesto,
  subtitulo,
  titulares,
  quitar,
  onCerrar,
}: {
  puesto: Puesto;
  subtitulo: string;
  titulares: TitularesPuesto;
  quitar: boolean;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const hoy = hoyCl();
  const [guardia, setGuardia] = useState("");
  const [desde, setDesde] = useState(hoy);
  const [inicio, setInicio] = useState(hoy);
  const [inicioPropio, setInicioPropio] = useState(false);
  const [calculada, setCalculada] = useState<{ clave: string; datos: PrevisualizacionTitular } | null>(null);
  const listo = Boolean(desde) && (quitar || (Boolean(guardia) && Boolean(inicio)));
  const input = {
    puestoId: puesto.id,
    titularPersonaId: quitar ? null : guardia,
    desde,
    ...(quitar ? {} : { inicioCiclo: inicio }),
  };
  const clave = JSON.stringify(input);
  // La vista previa vale solo para los datos con que se calculó: si el formulario cambia, desaparece.
  const previa = listo && calculada?.clave === clave ? calculada.datos : null;

  // Vista previa en vivo (dryRun): serie que se cierra, primeros días y choques por doblar turnos.
  useEffect(() => {
    if (!listo) return;
    let vigente = true;
    const t = setTimeout(() => {
      void ejecutar<PrevisualizacionTitular>("pauta.titular.asignar", JSON.parse(clave), true).then((r) => {
        if (vigente && r) setCalculada({ clave, datos: r });
      });
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [clave, listo, ejecutar]);

  async function confirmar() {
    const r = await ejecutar("pauta.titular.asignar", input);
    if (r) {
      avisar.exito(quitar ? "Titular quitado: el puesto quedó por cubrir" : "Titular asignado");
      onCerrar();
    }
  }
  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={`${quitar ? "Quitar titular" : "Asignar titular"} · ${puesto.nombre}`}
      descripcion={subtitulo}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant={quitar ? "destructive" : "primary"}
            cargando={pendiente && Boolean(previa)}
            disabled={!previa || pendiente}
            onClick={() => void confirmar()}
          >
            {quitar ? "Quitar titular" : "Asignar titular"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && listo ? <Alerta tono="danger" titulo="No se puede aplicar el cambio">{error}</Alerta> : null}
        {quitar ? null : (
          <Campo etiqueta="Guardia" htmlFor="t-guardia" ayuda="Solo aparecen guardias con vínculo vigente en esta instalación.">
            <Combobox
              id="t-guardia"
              opciones={titulares.candidatos.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
              valor={guardia}
              onCambiar={([v]) => setGuardia(v ?? "")}
              placeholder="Elegir guardia"
            />
          </Campo>
        )}
        <Campo etiqueta="Rige desde" htmlFor="t-desde" ayuda="Si el puesto ya tenía serie, no puede ser anterior a hoy: no se cambian días pasados.">
          <InputFecha
            id="t-desde"
            valor={desde}
            onCambiar={(v) => {
              setDesde(v);
              if (!inicioPropio) setInicio(v);
            }}
          />
        </Campo>
        {quitar ? null : (
          <Campo etiqueta="Inicio de ciclo" htmlFor="t-inicio" ayuda="Primer día de trabajo de un ciclo; fija la fase del patrón.">
            <InputFecha
              id="t-inicio"
              valor={inicio}
              onCambiar={(v) => {
                setInicio(v);
                setInicioPropio(true);
              }}
            />
          </Campo>
        )}
        {previa ? <VistaPreviaTitular datos={previa} quitar={quitar} /> : null}
        {!previa && listo && pendiente ? <p className="t-caption text-fg-muted">Calculando la vista previa…</p> : null}
      </div>
    </Sheet>
  );
}
