"use client";

import { useState } from "react";

import { Button, Campo, Input, avisar } from "@opai/ds";

import { useParametros } from "@/app/_components/maestros/use-url";
import type { CeldaDia } from "./tipos";

type EjecutarCap = (id: string, input: unknown) => Promise<unknown | null>;

/** Confirmar cobertura, marca manual y accesos a reemplazo/refuerzo (vista diaria). */
export function AccionesDiaPauta({
  puestoId,
  fecha,
  celda,
  puedeEditar,
  asistenciaActiva,
  clave,
  pendiente,
  ejecutar,
  onHecho,
  onDeshacerConfirmacion,
}: {
  puestoId: string;
  fecha: string;
  celda: CeldaDia;
  puedeEditar: boolean;
  /** Con Asistencia activa la presencia sale de las marcas legales: no se confirma ni se marca a mano. */
  asistenciaActiva: boolean;
  clave: string;
  pendiente: boolean;
  ejecutar: EjecutarCap;
  onHecho: () => void;
  onDeshacerConfirmacion: () => void;
}) {
  const { fijar } = useParametros();
  const [motivoMarca, setMotivoMarca] = useState("");

  async function confirmarCobertura() {
    if (await ejecutar("pauta.cobertura.confirmar", { puestoId, fecha })) {
      avisar.exito("Cobertura confirmada");
      onHecho();
    }
  }
  async function registrarMarca() {
    if (await ejecutar("pauta.marca.registrar", { puestoId, fecha, motivo: motivoMarca.trim() })) {
      avisar.exito("Marca registrada");
      onHecho();
    }
  }

  if (!puedeEditar) return null;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <p className="t-caption text-fg-muted">
        {asistenciaActiva
          ? "La presencia sale de las marcas de Asistencia: aquí no se confirma ni se marca a mano."
          : "Asistencia no activada: sin marcas para cruzar."}
      </p>
      {!asistenciaActiva && celda.estado === "cubierto" && !celda.confirmado ? (
        <Button onClick={() => void confirmarCobertura()} cargando={pendiente}>
          Confirmar cobertura
        </Button>
      ) : null}
      {!asistenciaActiva && celda.confirmado ? (
        <Button variant="secondary" onClick={onDeshacerConfirmacion} cargando={pendiente}>
          Deshacer confirmación
        </Button>
      ) : null}
      {!asistenciaActiva && !celda.marcaManual ? (
        <>
          <Campo etiqueta="Motivo de la marca" htmlFor="marca-motivo">
            <Input
              id="marca-motivo"
              value={motivoMarca}
              placeholder="Presencia confirmada por teléfono…"
              onChange={(e) => setMotivoMarca(e.target.value)}
            />
          </Campo>
          <Button
            variant="secondary"
            onClick={() => void registrarMarca()}
            cargando={pendiente}
            disabled={motivoMarca.trim().length < 3}
          >
            Registrar marca manual
          </Button>
        </>
      ) : null}
      {celda.estado === "ppc" ? (
        <Button variant="secondary" onClick={() => fijar({ reemplazo: clave, dia: null })}>
          Asignar reemplazo
        </Button>
      ) : null}
      {celda.estado === "ppc" || celda.estado === "cubierto" ? (
        <Button variant="secondary" onClick={() => fijar({ refuerzo: clave, dia: null })}>
          Agregar refuerzo
        </Button>
      ) : null}
    </div>
  );
}
