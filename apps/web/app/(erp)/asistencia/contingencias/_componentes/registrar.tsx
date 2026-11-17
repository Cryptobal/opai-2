"use client";

import { useState } from "react";

import { avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { FormRegistrarContingencia } from "./form-registrar";

type Props = { abierto: boolean; onCerrar: () => void; onListo: () => void };

export function RegistrarContingencia({ abierto, onCerrar, onListo }: Props) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [personaId, setPersonaId] = useState("");
  const [instalacionId, setInstalacionId] = useState("");
  const [tipo, setTipo] = useState<string>("entrada");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [docId, setDocId] = useState("");

  async function registrar() {
    limpiarError();
    const r = await ejecutar<{ id: string }>("asistencia.contingencias.registrar", {
      personaId,
      instalacionId,
      tipo,
      horaDeclarada: new Date(hora).toISOString(),
      motivo: motivo.trim(),
      evidenciaDocumentoId: docId,
    });
    if (!r) return;
    avisar.exito("Contingencia registrada");
    onListo();
    onCerrar();
  }

  const valido = personaId && instalacionId && hora && motivo.trim().length >= 10 && docId;

  return (
    <Sheet
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Registrar marca de contingencia"
      acciones={
        <Button block size="lg" disabled={pendiente || !valido} onClick={() => void registrar()}>
          {pendiente ? "Registrando…" : "Registrar marca"}
        </Button>
      }
    >
      <FormRegistrarContingencia
        personaId={personaId}
        setPersonaId={setPersonaId}
        instalacionId={instalacionId}
        setInstalacionId={setInstalacionId}
        tipo={tipo}
        setTipo={setTipo}
        hora={hora}
        setHora={setHora}
        motivo={motivo}
        setMotivo={setMotivo}
        docId={docId}
        setDocId={setDocId}
        {...(error ? { error } : {})}
      />
    </Sheet>
  );
}