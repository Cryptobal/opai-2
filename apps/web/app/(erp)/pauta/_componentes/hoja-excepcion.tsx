"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Campo, Input, InputFecha, Select, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { descripcionCelda } from "./celda-turno";
import { diaSemana, fechaCl, MOTIVO } from "./etiquetas";
import type { MesPauta } from "./tipos";

const TIPOS = [
  { valor: "ausencia", etiqueta: "Ausencia" },
  { valor: "licencia", etiqueta: "Licencia médica" },
  { valor: "vacaciones", etiqueta: "Vacaciones" },
  { valor: "permiso", etiqueta: "Permiso" },
] as const;

/** P03: un día de un puesto. Registra una excepción (día o rango) o anula la que tiene. */
export function HojaExcepcion({ mes, puedeEditar }: { mes: MesPauta; puedeEditar: boolean }) {
  const hoja = useHojaUrl("dia");
  if (!hoja.abierta || !hoja.valor) return null;
  const [puestoId, fecha] = hoja.valor.split("_");
  const puesto = mes.puestos.find((p) => p.id === puestoId);
  const celda = puesto?.celdas.find((c) => c.fecha === fecha);
  if (!puesto || !celda || !fecha) return null;
  return <Formulario key={hoja.valor} mes={mes} puestoId={puesto.id} fecha={fecha} puedeEditar={puedeEditar} onCerrar={hoja.cerrar} />;
}

function Formulario({
  mes,
  puestoId,
  fecha,
  puedeEditar,
  onCerrar,
}: {
  mes: MesPauta;
  puestoId: string;
  fecha: string;
  puedeEditar: boolean;
  onCerrar: () => void;
}) {
  const puesto = mes.puestos.find((p) => p.id === puestoId)!;
  const celda = puesto.celdas.find((c) => c.fecha === fecha)!;
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [tipo, setTipo] = useState<string>("ausencia");
  const [hasta, setHasta] = useState(fecha);
  const [motivo, setMotivo] = useState("");
  const trabaja = celda.estado === "cubierto" || celda.estado === "ppc";
  const titular = puesto.serie?.titular ?? null;

  async function registrar() {
    const r = await ejecutar("pauta.excepciones.crear", { puestoId, tipo, motivo: motivo.trim(), desde: fecha, hasta });
    if (r) {
      avisar.exito(titular ? `Excepción registrada · se avisará a ${titular}` : "Excepción registrada");
      onCerrar();
    }
  }
  async function anular() {
    if (await ejecutar("pauta.excepciones.anular", { puestoId, desde: fecha })) {
      avisar.exito("Excepción anulada");
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={`${puesto.nombre} · ${diaSemana(fecha)} ${fechaCl(fecha)}`}
      descripcion={`${puesto.horario} · ${titular ?? "Sin titular"}`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cerrar
          </Button>
          {puedeEditar && celda.excepcion ? (
            <Button variant="destructive" onClick={anular} cargando={pendiente}>
              Anular excepción
            </Button>
          ) : null}
          {puedeEditar && !celda.excepcion && trabaja ? (
            <Button onClick={registrar} cargando={pendiente} disabled={motivo.trim().length < 3 || hasta < fecha}>
              Registrar
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <p className="flex flex-wrap items-center gap-2 text-base">
          <Badge tono={celda.estado === "ppc" ? "danger" : celda.estado === "cubierto" ? "success" : "neutro"}>
            {descripcionCelda(celda).split(" · ")[0]}
          </Badge>
          {celda.motivo ? <span className="text-fg-muted">{MOTIVO[celda.motivo]}</span> : null}
          {celda.feriado ? <Badge tono="warning">{celda.feriado}</Badge> : null}
        </p>
        {puedeEditar && !celda.excepcion && trabaja ? (
          <>
            <Campo etiqueta="Tipo" htmlFor="ex-tipo">
              <Select id="ex-tipo" valor={tipo} onCambiar={setTipo} opciones={TIPOS} />
            </Campo>
            <Campo etiqueta="Hasta" htmlFor="ex-hasta" ayuda="Para varios días seguidos. Los días libres del puesto no cuentan.">
              <InputFecha id="ex-hasta" valor={hasta} onCambiar={setHasta} />
            </Campo>
            <Campo etiqueta="Motivo" htmlFor="ex-motivo">
              <Input id="ex-motivo" value={motivo} placeholder="Licencia médica folio…" onChange={(e) => setMotivo(e.target.value)} />
            </Campo>
          </>
        ) : null}
        {!trabaja && !celda.excepcion ? (
          <p className="t-caption">Este día no es de turno según la serie del puesto.</p>
        ) : null}
        {!puedeEditar ? <p className="t-caption">Solo lectura: tu rol no edita la pauta.</p> : null}
      </div>
    </Sheet>
  );
}
