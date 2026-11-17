"use client";

import { useEffect, useState } from "react";

import { avisar, Button, Sheet } from "@opai/ds";

import { subirDocumento } from "@/app/_components/documentos/subir";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { CamposProponerCorreccion, type MarcaCorreccion } from "./proponer-correccion-campos";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  onListo: () => void;
  personaId: string;
  personaNombre: string;
  desde: string;
  hasta: string;
};

function subirEvidencia(personaId: string, onListo: (id: string) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.onchange = async () => {
    const archivo = input.files?.[0];
    if (!archivo) return;
    const id = await subirDocumento({ tipo: "persona", id: personaId }, archivo, {}, () => {}, "erp");
    if (id) onListo(id);
  };
  input.click();
}

export function ProponerCorreccion(p: Props) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [marcas, setMarcas] = useState<MarcaCorreccion[]>([]);
  const [marcaId, setMarcaId] = useState("");
  const [tipo, setTipo] = useState("entrada");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [docId, setDocId] = useState("");
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);

  useEffect(() => {
    if (!p.abierto) return;
    void ejecutar<{ items: MarcaCorreccion[] }>("asistencia.marcas.listar", {
      personaId: p.personaId,
      desde: p.desde,
      hasta: p.hasta,
    }).then((r) => {
      if (r?.items.length) {
        setMarcas(r.items);
        setMarcaId(r.items[0]?.id ?? "");
      }
    });
  }, [p.abierto, p.personaId, p.desde, p.hasta, ejecutar]);

  async function previsualizar() {
    limpiarError();
    const r = await ejecutar<{ venceEn: string }>(
      "asistencia.correcciones.proponer",
      { marcaId, tipoPropuesto: tipo, horaPropuesta: new Date(hora).toISOString(), motivo: motivo.trim(), evidenciaDocumentoId: docId },
      true,
    );
    if (r) setVistaPrevia(new Date(r.venceEn).toLocaleString("es-CL"));
  }

  async function confirmar() {
    const r = await ejecutar("asistencia.correcciones.proponer", {
      marcaId,
      tipoPropuesto: tipo,
      horaPropuesta: new Date(hora).toISOString(),
      motivo: motivo.trim(),
      evidenciaDocumentoId: docId,
    });
    if (!r) return;
    avisar.exito("Corrección propuesta");
    p.onListo();
    p.onCerrar();
  }

  const valido = marcaId && hora && motivo.trim().length >= 5 && docId;

  return (
    <Sheet
      abierto={p.abierto}
      onCerrar={p.onCerrar}
      titulo="Proponer corrección"
      descripcion={p.personaNombre}
      acciones={
        <div className="flex flex-col gap-2">
          <Button block size="lg" variant="secondary" disabled={pendiente || !valido} onClick={() => void previsualizar()}>
            Vista previa
          </Button>
          <Button block size="lg" disabled={pendiente || !valido} onClick={() => void confirmar()}>
            {pendiente ? "Enviando…" : "Proponer corrección"}
          </Button>
        </div>
      }
    >
      <CamposProponerCorreccion
        marcas={marcas}
        marcaId={marcaId}
        onMarcaId={setMarcaId}
        tipo={tipo}
        onTipo={setTipo}
        hora={hora}
        onHora={setHora}
        motivo={motivo}
        onMotivo={setMotivo}
        docId={docId}
        {...(error ? { error } : {})}
        vistaPrevia={vistaPrevia}
        onSubirEvidencia={() => subirEvidencia(p.personaId, setDocId)}
      />
    </Sheet>
  );
}