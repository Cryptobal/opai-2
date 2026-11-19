"use client";

import { Button, Campo, Input, Select, Textarea } from "@opai/ds";

const TIPOS = [
  { valor: "entrada", etiqueta: "Entrada" },
  { valor: "salida", etiqueta: "Salida" },
  { valor: "inicio_colacion", etiqueta: "Inicio de colación" },
  { valor: "fin_colacion", etiqueta: "Fin de colación" },
];

export type MarcaCorreccion = { id: string; tipo: string; horaServidor: string };

type Props = {
  marcas: MarcaCorreccion[];
  marcaId: string;
  onMarcaId: (id: string) => void;
  tipo: string;
  onTipo: (t: string) => void;
  hora: string;
  onHora: (h: string) => void;
  motivo: string;
  onMotivo: (m: string) => void;
  docId: string;
  error?: string;
  vistaPrevia: string | null;
  onSubirEvidencia: () => void;
};

export function CamposProponerCorreccion(p: Props) {
  const marca = p.marcas.find((m) => m.id === p.marcaId);
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Marca a corregir">
        <Select
          valor={p.marcaId}
          opciones={p.marcas.map((m) => ({
            valor: m.id,
            etiqueta: `${m.tipo} · ${new Date(m.horaServidor).toLocaleString("es-CL")}`,
          }))}
          onCambiar={p.onMarcaId}
        />
      </Campo>
      {marca ? (
        <p className="t-caption text-fg-muted">
          Original: {marca.tipo} · {new Date(marca.horaServidor).toLocaleString("es-CL")}
        </p>
      ) : null}
      <Campo etiqueta="Tipo propuesto">
        <Select valor={p.tipo} opciones={TIPOS} onCambiar={p.onTipo} />
      </Campo>
      <Campo etiqueta="Hora propuesta" htmlFor="hora-cor">
        <Input
          id="hora-cor"
          type="datetime-local"
          value={p.hora}
          onChange={(e) => p.onHora(e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Motivo" {...(p.error ? { error: p.error } : {})}>
        <Textarea rows={3} maxLength={500} value={p.motivo} onChange={(e) => p.onMotivo(e.target.value)} />
      </Campo>
      <Campo etiqueta="Evidencia">
        <Button type="button" variant="secondary" onClick={p.onSubirEvidencia}>
          {p.docId ? "Cambiar archivo" : "Subir evidencia"}
        </Button>
      </Campo>
      {p.vistaPrevia ? <p className="t-caption text-fg-muted">Si no responde antes del {p.vistaPrevia}, vence con el valor original.</p> : null}
    </div>
  );
}