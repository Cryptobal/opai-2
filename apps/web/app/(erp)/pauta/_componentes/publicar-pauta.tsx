"use client";

import { lazy, Suspense, useState } from "react";

import { formatearFecha } from "@opai/domain";
import { Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { claveMes, nombreMes } from "./etiquetas";

// Aparte (React.lazy, ADR-037): el diálogo solo se baja al tocar «Publicar»; la ruta /pauta está al tope de JS.
const DialogoConfirmar = lazy(() =>
  import("@/app/_components/maestros/dialogo-confirmar").then((m) => ({
    default: m.DialogoConfirmar,
  })),
);

type Resumen = {
  instalacion: string;
  personas: number;
  conUsuario: number;
  turnos: number;
  publicadaAntes: string | null;
  publicadaEn: string | null;
};

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** Texto del diálogo: a quién llega el aviso y si el mes ya estaba publicado. */
function descripcion(r: Resumen, mesTexto: string) {
  if (r.personas === 0)
    return `${r.instalacion} no tiene turnos de titulares en ${mesTexto}. No se avisará a nadie.`;
  const sinUsuario = r.personas - r.conUsuario;
  const partes = [
    `${r.instalacion}, ${mesTexto}: ${plural(r.turnos, "turno", "turnos")} de ${plural(r.personas, "titular", "titulares")}.`,
    `${plural(r.conUsuario, "persona recibe", "personas reciben")} el aviso en su portal.`,
  ];
  if (sinUsuario > 0)
    partes.push(
      `${plural(sinUsuario, "persona no tiene", "personas no tienen")} usuario en OPAI y no recibirá aviso.`,
    );
  if (r.publicadaAntes)
    partes.push(`Ya se publicó el ${formatearFecha(r.publicadaAntes)}: se volverá a avisar.`);
  return partes.join(" ");
}

type Props = { inst: string; anio: number; mes: number };

/** Botón «Publicar» de la pauta mensual (CAR-356): vista previa con el alcance y, al confirmar, aviso a los guardias. */
export function PublicarPauta({ inst, anio, mes }: Props) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const input = { instalacionId: inst, mes: claveMes(anio, mes) };
  const mesTexto = nombreMes(anio, mes);

  const abrir = async () => {
    setHecho(null);
    const r = await ejecutar<Resumen>("pauta.publicaciones.publicar", input, true, "ninguna");
    if (r) setResumen(r);
  };
  const cerrar = () => {
    setResumen(null);
    limpiarError();
  };
  const confirmar = async () => {
    const r = await ejecutar<Resumen>(
      "pauta.publicaciones.publicar",
      input,
      false,
      "ninguna",
      crypto.randomUUID(),
    );
    if (!r) return;
    setResumen(null);
    setHecho(
      r.conUsuario > 0
        ? `Pauta publicada: ${plural(r.conUsuario, "aviso enviado", "avisos enviados")}.`
        : "Pauta publicada; nadie tiene usuario para recibir el aviso.",
    );
  };

  return (
    <>
      <Button variant="secondary" disabled={pendiente && !resumen} onClick={abrir}>
        Publicar
      </Button>
      <span className="t-caption text-fg-muted" role="status" aria-live="polite">
        {hecho ?? (!resumen && error ? error : "")}
      </span>
      {resumen ? (
        <Suspense fallback={null}>
          <DialogoConfirmar
            confirmacion={{
              titulo: "Publicar la pauta",
              descripcion: descripcion(resumen, mesTexto),
              boton: resumen.publicadaAntes ? "Publicar de nuevo" : "Publicar y avisar",
            }}
            pendiente={pendiente}
            error={error}
            onCerrar={cerrar}
            onConfirmar={() => void confirmar()}
          />
        </Suspense>
      ) : null}
    </>
  );
}
