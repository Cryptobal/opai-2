"use client";

import { avisar, Button, Campo, Combobox, Input, Select, Textarea } from "@opai/ds";

import { buscarCandidatosDocumento } from "@/app/_acciones/candidatos-documento";
import { opcionesDeCandidatos } from "@/app/_components/documentos/opciones-candidatos";
import { subirDocumento } from "@/app/_components/documentos/subir";

const TIPOS = [
  { valor: "entrada", etiqueta: "Entrada" },
  { valor: "salida", etiqueta: "Salida" },
  { valor: "inicio_colacion", etiqueta: "Inicio de colación" },
  { valor: "fin_colacion", etiqueta: "Fin de colación" },
];

type Props = {
  personaId: string;
  setPersonaId: (v: string) => void;
  instalacionId: string;
  setInstalacionId: (v: string) => void;
  tipo: string;
  setTipo: (v: string) => void;
  hora: string;
  setHora: (v: string) => void;
  motivo: string;
  setMotivo: (v: string) => void;
  docId: string;
  setDocId: (v: string) => void;
  error?: string;
};

const buscar = async (tipo: "persona" | "instalacion", q: string) =>
  opcionesDeCandidatos(await buscarCandidatosDocumento({ tipo, q }));

export function FormRegistrarContingencia(p: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Trabajador">
        <Combobox
          valor={p.personaId}
          onCambiar={([v]) => p.setPersonaId(v ?? "")}
          opciones={[]}
          onBuscar={(q) => buscar("persona", q)}
          placeholder="Buscar persona"
        />
      </Campo>
      <Campo etiqueta="Instalación">
        <Combobox
          valor={p.instalacionId}
          onCambiar={([v]) => p.setInstalacionId(v ?? "")}
          opciones={[]}
          onBuscar={(q) => buscar("instalacion", q)}
          placeholder="Buscar instalación"
        />
      </Campo>
      <Campo etiqueta="Tipo">
        <Select valor={p.tipo} opciones={TIPOS} onCambiar={p.setTipo} />
      </Campo>
      <Campo etiqueta="Fecha y hora declaradas" htmlFor="hora">
        <Input id="hora" type="datetime-local" value={p.hora} onChange={(e) => p.setHora(e.target.value)} />
      </Campo>
      <Campo etiqueta="Motivo" {...(p.error ? { error: p.error } : {})}>
        <Textarea rows={3} maxLength={500} value={p.motivo} onChange={(e) => p.setMotivo(e.target.value)} />
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
              if (!p.personaId) {
                avisar.error("Elige primero al trabajador.");
                return;
              }
              const id = await subirDocumento({ tipo: "persona", id: p.personaId }, archivo, {}, () => {}, "erp");
              if (id) p.setDocId(id);
            };
            input.click();
          }}
        >
          {p.docId ? "Cambiar archivo" : "Subir evidencia"}
        </Button>
      </Campo>
    </div>
  );
}