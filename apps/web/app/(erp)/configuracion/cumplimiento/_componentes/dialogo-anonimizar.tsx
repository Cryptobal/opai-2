"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Dialog, Skeleton, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaCorta } from "@/lib/formato";

type Previa = {
  elegible: boolean;
  yaEstabaAnonimizado: boolean;
  motivo: string | null;
  procedeDesde: string | null;
  documentosVinculados: number;
};

type Props = {
  titular: { tipo: string; id: string };
  solicitudId: string;
  onCerrar: () => void;
};

/**
 * Anonimizar al titular de una solicitud de cancelación (`titular_anonimizar`, única purga forzada).
 * Primero la vista previa (dryRun): dice si procede o por qué no (vínculo vigente, plazo de
 * conservación, otras solicitudes abiertas). Es irreversible y conserva los hechos regulados.
 */
export function DialogoAnonimizar({ titular, solicitudId, onCerrar }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [motivo, setMotivo] = useState("");
  const base = { titular, solicitudId, motivo: "Vista previa de la cancelación" };
  useEffect(() => {
    void ejecutar<Previa>("core.cumplimiento.titular_anonimizar", base, true).then(setPrevia);
    // Solo al abrir: la vista previa no depende del motivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function confirmar() {
    const r = await ejecutar("core.cumplimiento.titular_anonimizar", {
      ...base,
      motivo: motivo.trim(),
    });
    if (!r) return;
    avisar.exito("Titular anonimizado");
    onCerrar();
  }
  const procede = previa?.elegible && !previa.yaEstabaAnonimizado;
  return (
    <Dialog
      abierto
      onCerrar={onCerrar}
      titulo="Anonimizar al titular"
      descripcion="Quita su identidad de forma irreversible. Los hechos regulados (vínculos, remuneraciones, bitácoras) se conservan."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={pendiente || !procede || motivo.trim().length < 5}
            onClick={() => void confirmar()}
          >
            Anonimizar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {!previa && !error ? <Skeleton className="h-16 w-full" /> : null}
        {previa?.yaEstabaAnonimizado ? (
          <Alerta tono="info" titulo="El titular ya estaba anonimizado." />
        ) : previa && !previa.elegible ? (
          <Alerta tono="warning" titulo="Hoy no procede">
            {previa.motivo}
            {previa.procedeDesde ? ` Procede desde ${fechaCorta(previa.procedeDesde)}.` : ""}
          </Alerta>
        ) : null}
        {previa && previa.documentosVinculados > 0 ? (
          <p className="t-caption">
            {previa.documentosVinculados} documento(s) vinculado(s) no se tocan: su política está
            pendiente.
          </p>
        ) : null}
        {procede ? (
          <Campo etiqueta="Motivo" htmlFor="anon-motivo" ayuda="Queda en la auditoría">
            <Textarea
              id="anon-motivo"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Campo>
        ) : null}
      </div>
    </Dialog>
  );
}
