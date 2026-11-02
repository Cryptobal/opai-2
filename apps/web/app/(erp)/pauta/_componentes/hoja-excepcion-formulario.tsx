"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { AccionesDiaPauta } from "./acciones-dia-pauta";
import { BadgesEstadoCelda } from "./badges-celda-pauta";
import { CamposExcepcionDiaria, CamposExcepcionMensual } from "./campos-excepcion";
import { DialogosExcepcion } from "./dialogos-excepcion";
import { diaSemana, fechaCl, personaEnTurno } from "./etiquetas";
import type { CeldaDia, MesPauta } from "./tipos";

export function HojaExcepcionFormulario({
  mes,
  puestoId,
  puestoNombre,
  horario,
  fecha,
  celda,
  puedeEditar,
  diaria,
  onCerrar,
}: {
  mes: MesPauta;
  puestoId: string;
  puestoNombre: string;
  horario: string;
  fecha: string;
  celda: CeldaDia;
  puedeEditar: boolean;
  diaria: boolean;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [tipo, setTipo] = useState<string>("ausencia");
  const [hasta, setHasta] = useState(fecha);
  const [motivo, setMotivo] = useState("");
  const [confirmarAnulacion, setConfirmarAnulacion] = useState(false);
  const [confirmarDeshacer, setConfirmarDeshacer] = useState(false);
  const trabaja = celda.estado === "cubierto" || celda.estado === "ppc";
  const titular = personaEnTurno(mes, celda.titularId, celda.cubiertoPorId);
  const clave = `${puestoId}_${fecha}`;

  async function registrar() {
    const r = await ejecutar("pauta.excepciones.crear", { puestoId, tipo, motivo: motivo.trim(), desde: fecha, hasta });
    if (r) {
      avisar.exito("Excepción registrada");
      onCerrar();
    }
  }
  async function anular() {
    if (await ejecutar("pauta.excepciones.anular", { puestoId, desde: fecha })) {
      avisar.exito("Excepción anulada");
      onCerrar();
    }
  }
  async function deshacerCobertura() {
    if (await ejecutar("pauta.cobertura.deshacer", { puestoId, fecha })) {
      avisar.exito("Confirmación anulada");
      onCerrar();
    }
  }

  return (
    <>
      <Sheet
        abierto
        onCerrar={onCerrar}
        titulo={`${puestoNombre} · ${diaSemana(fecha)} ${fechaCl(fecha)}`}
        descripcion={`${horario} · ${titular}`}
        acciones={
          <>
            <Button variant="secondary" onClick={onCerrar}>
              Cerrar
            </Button>
            {puedeEditar && celda.excepcion ? (
              <Button variant="destructive" onClick={() => setConfirmarAnulacion(true)} cargando={pendiente}>
                Anular excepción
              </Button>
            ) : null}
            {puedeEditar && !celda.excepcion && trabaja && !diaria ? (
              <Button onClick={registrar} cargando={pendiente} disabled={motivo.trim().length < 3 || hasta < fecha}>
                Registrar
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <BadgesEstadoCelda celda={celda} />
          {diaria && trabaja ? (
            <AccionesDiaPauta
              puestoId={puestoId}
              fecha={fecha}
              celda={celda}
              puedeEditar={puedeEditar}
              clave={clave}
              pendiente={pendiente}
              ejecutar={ejecutar}
              onHecho={onCerrar}
              onDeshacerConfirmacion={() => setConfirmarDeshacer(true)}
            />
          ) : null}
          {puedeEditar && !celda.excepcion && trabaja && !diaria ? (
            <CamposExcepcionMensual
              tipo={tipo}
              setTipo={setTipo}
              hasta={hasta}
              setHasta={setHasta}
              motivo={motivo}
              setMotivo={setMotivo}
            />
          ) : null}
          {diaria && puedeEditar && !celda.excepcion && trabaja && celda.estado === "ppc" ? (
            <CamposExcepcionDiaria
              tipo={tipo}
              setTipo={setTipo}
              hasta={hasta}
              setHasta={setHasta}
              motivo={motivo}
              setMotivo={setMotivo}
              fecha={fecha}
              pendiente={pendiente}
              onRegistrar={registrar}
            />
          ) : null}
          {!trabaja && !celda.excepcion ? (
            <p className="t-caption">Este día no es de turno según la serie del puesto.</p>
          ) : null}
          {!puedeEditar ? <p className="t-caption">Solo lectura: tu rol no edita la pauta.</p> : null}
        </div>
      </Sheet>
      <DialogosExcepcion
        puestoNombre={puestoNombre}
        fecha={fecha}
        pendiente={pendiente}
        error={error}
        confirmarAnulacion={confirmarAnulacion}
        confirmarDeshacer={confirmarDeshacer}
        onCerrarAnulacion={() => setConfirmarAnulacion(false)}
        onCerrarDeshacer={() => setConfirmarDeshacer(false)}
        onAnular={() => void anular()}
        onDeshacer={() => void deshacerCobertura()}
      />
    </>
  );
}
