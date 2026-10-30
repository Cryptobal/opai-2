"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, InputFecha, Sheet, Switch } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { type DiaVista, fechaCl } from "./tipos";

type Props = { dia?: DiaVista };

const NOMBRE_MAX = 120; // mismo tope que nombreFeriadoSchema en el núcleo

/** Agregar un día propio de la empresa (`?nuevo=1`) o editar/archivar uno existente (`?editar=<id>`). */
export function HojaDia({ dia }: Props) {
  const hoja = useHojaUrl(dia ? "editar" : "nuevo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [fecha, setFecha] = useState(dia?.fecha ?? "");
  const [nombre, setNombre] = useState(dia?.nombre ?? "");
  const [irrenunciable, setIrrenunciable] = useState(dia?.irrenunciable ?? false);
  const [intentado, setIntentado] = useState(false);

  const nombreVacio = nombre.trim().length < 2;
  const nombreLargo = nombre.trim().length > NOMBRE_MAX;
  const fechaMala = !dia && !/^\d{4}-\d{2}-\d{2}$/.test(fecha);
  const errorNombre = intentado && nombreVacio ? "Ingresa un nombre." : nombreLargo ? `Máximo ${NOMBRE_MAX} caracteres.` : undefined;
  const errorFecha = (intentado || fecha.length > 0) && fechaMala ? "Fecha inválida." : undefined;

  async function guardar() {
    setIntentado(true);
    if (nombreVacio || nombreLargo || fechaMala) {
      avisar.error("Revisa los campos marcados.");
      return;
    }
    const r = dia
      ? await ejecutar("core.calendario.actualizar", { id: dia.id, nombre: nombre.trim(), irrenunciable })
      : await ejecutar("core.calendario.crear_feriado", { fecha, nombre: nombre.trim(), irrenunciable });
    if (!r) return;
    avisar.exito(dia ? "Día actualizado" : "Día agregado");
    hoja.cerrar();
  }

  async function archivar() {
    if (!dia) return;
    const r = await ejecutar("core.calendario.archivar", { id: dia.id });
    if (!r) return;
    avisar.exito("Día archivado");
    hoja.cerrar();
  }

  return (
    <Sheet
      abierto={dia ? hoja.valor === dia.id : hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={dia ? `Editar ${dia.nombre}` : "Agregar día"}
      acciones={
        <>
          {dia ? (
            <Button variant="destructive" disabled={pendiente} onClick={() => void archivar()}>
              Archivar
            </Button>
          ) : null}
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : dia ? "Guardar" : "Agregar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {dia ? (
          <Campo etiqueta="Fecha">
            <div className="t-numeric text-md text-fg">{fechaCl(dia.fecha)}</div>
          </Campo>
        ) : (
          <Campo
            etiqueta="Fecha"
            htmlFor="c-fecha"
            ayuda="Se cuenta como feriado de la empresa."
            error={errorFecha}
          >
            <InputFecha
              id="c-fecha"
              valor={fecha}
              onCambiar={setFecha}
              invalido={!!errorFecha}
              aria-describedby={errorFecha ? "c-fecha-error" : undefined}
            />
          </Campo>
        )}
        <Campo etiqueta="Nombre" htmlFor="c-nombre" error={errorNombre}>
          <Input
            id="c-nombre"
            value={nombre}
            maxLength={NOMBRE_MAX}
            onChange={(e) => setNombre(e.target.value)}
            aria-invalid={!!errorNombre || undefined}
            aria-describedby={errorNombre ? "c-nombre-error" : undefined}
          />
        </Campo>
        <Switch
          etiqueta="Irrenunciable"
          descripcion="El comercio no puede abrir ese día (Ley 19.973)."
          activo={irrenunciable}
          onCambiar={setIrrenunciable}
        />
      </div>
    </Sheet>
  );
}
