"use client";

import { useState } from "react";

import { avisar, Button, Campo, Combobox, Input, Select, Sheet, Textarea } from "@opai/ds";

import { buscarCandidatosDocumento } from "@/app/_acciones/candidatos-documento";
import { subirDocumento } from "@/app/_components/documentos/subir";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = { abierto: boolean; onCerrar: () => void; onListo: () => void };

const TIPOS = [
  { valor: "entrada", etiqueta: "Entrada" },
  { valor: "salida", etiqueta: "Salida" },
  { valor: "inicio_colacion", etiqueta: "Inicio de colación" },
  { valor: "fin_colacion", etiqueta: "Fin de colación" },
];

export function RegistrarContingencia({ abierto, onCerrar, onListo }: Props) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [personaId, setPersonaId] = useState("");
  const [instalacionId, setInstalacionId] = useState("");
  const [tipo, setTipo] = useState<string>("entrada");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [docId, setDocId] = useState("");

  const buscar = async (tipo: "persona" | "instalacion", q: string) => {
    const r = await buscarCandidatosDocumento({ tipo, q });
    return r.ok ? r.items : [];
  };

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
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Trabajador">
          <Combobox
            valor={personaId}
            onCambiar={([v]) => setPersonaId(v ?? "")}
            opciones={[]}
            onBuscar={(q) => buscar("persona", q)}
            placeholder="Buscar persona"
          />
        </Campo>
        <Campo etiqueta="Instalación">
          <Combobox
            valor={instalacionId}
            onCambiar={([v]) => setInstalacionId(v ?? "")}
            opciones={[]}
            onBuscar={(q) => buscar("instalacion", q)}
            placeholder="Buscar instalación"
          />
        </Campo>
        <Campo etiqueta="Tipo">
          <Select valor={tipo} opciones={TIPOS} onCambiar={setTipo} />
        </Campo>
        <Campo etiqueta="Fecha y hora declaradas" htmlFor="hora">
          <Input id="hora" type="datetime-local" value={hora} onChange={(e) => setHora(e.target.value)} />
        </Campo>
        <Campo etiqueta="Motivo" {...(error ? { error } : {})}>
          <Textarea rows={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Evidencia">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.onchange = async () => {
                const archivo = input.files?.[0];
                if (!archivo) return;
                if (!personaId) {
                  avisar.error("Elige primero al trabajador.");
                  return;
                }
                const id = await subirDocumento({ tipo: "persona", id: personaId }, archivo, {}, () => {}, "erp");
                if (id) setDocId(id);
              };
              input.click();
            }}
          >
            {docId ? "Cambiar archivo" : "Subir evidencia"}
          </Button>
        </Campo>
      </div>
    </Sheet>
  );
}