"use client";

import { useEffect, useState } from "react";

import { avisar, Button, Campo, Select, Sheet, Textarea } from "@opai/ds";

import { subirDocumento } from "@/app/_components/documentos/subir";
import { useCapacidad } from "@/app/_components/use-capacidad";

const TIPOS = [
  { valor: "entrada", etiqueta: "Entrada" },
  { valor: "salida", etiqueta: "Salida" },
  { valor: "inicio_colacion", etiqueta: "Inicio de colación" },
  { valor: "fin_colacion", etiqueta: "Fin de colación" },
];

type Marca = { id: string; tipo: string; horaServidor: string };

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  onListo: () => void;
  personaId: string;
  personaNombre: string;
  desde: string;
  hasta: string;
};

export function ProponerCorreccion(p: Props) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [marcaId, setMarcaId] = useState("");
  const [tipo, setTipo] = useState("entrada");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [docId, setDocId] = useState("");
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);

  useEffect(() => {
    if (!p.abierto) return;
    void ejecutar<{ items: Marca[] }>("asistencia.marcas.listar", {
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

  const marca = marcas.find((m) => m.id === marcaId);

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
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Marca a corregir">
          <Select
            valor={marcaId}
            opciones={marcas.map((m) => ({ valor: m.id, etiqueta: `${m.tipo} · ${new Date(m.horaServidor).toLocaleString("es-CL")}` }))}
            onCambiar={setMarcaId}
          />
        </Campo>
        {marca ? <p className="t-caption text-fg-muted">Original: {marca.tipo} · {new Date(marca.horaServidor).toLocaleString("es-CL")}</p> : null}
        <Campo etiqueta="Tipo propuesto">
          <Select valor={tipo} opciones={TIPOS} onCambiar={setTipo} />
        </Campo>
        <Campo etiqueta="Hora propuesta" htmlFor="hora-cor">
          <input id="hora-cor" type="datetime-local" className="w-full rounded-md border border-border bg-surface px-3 py-2" value={hora} onChange={(e) => setHora(e.target.value)} />
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
                const id = await subirDocumento({ tipo: "persona", id: p.personaId }, archivo, {}, () => {}, "erp");
                if (id) setDocId(id);
              };
              input.click();
            }}
          >
            {docId ? "Cambiar archivo" : "Subir evidencia"}
          </Button>
        </Campo>
        {vistaPrevia ? <p className="t-caption text-fg-muted">Si no responde antes del {vistaPrevia}, vence con el valor original.</p> : null}
      </div>
    </Sheet>
  );
}