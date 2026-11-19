import { Campo, Combobox, Input, Select, Textarea } from "@opai/ds";

import type { InstalacionOpcion, TipoTicket } from "./datos";
import { SIN_INSTALACION } from "./instalaciones-ticket";

const PRIORIDADES = [
  { valor: "p1", etiqueta: "P1 · Urgente" },
  { valor: "p2", etiqueta: "P2 · Alta" },
  { valor: "p3", etiqueta: "P3 · Media" },
  { valor: "p4", etiqueta: "P4 · Baja" },
];

export function NuevoTicketFormulario({
  tipos,
  tipoId,
  onTipo,
  tipo,
  titulo,
  onTitulo,
  descripcion,
  onDescripcion,
  prioridad,
  onPrioridad,
  instalaciones,
  instalacionId,
  onInstalacion,
  instOpciones,
  onBuscarInstalacion,
  error,
}: {
  tipos: TipoTicket[];
  tipoId: string;
  onTipo: (id: string) => void;
  tipo: TipoTicket | undefined;
  titulo: string;
  onTitulo: (v: string) => void;
  descripcion: string;
  onDescripcion: (v: string) => void;
  prioridad: string;
  onPrioridad: (v: string) => void;
  instalaciones: InstalacionOpcion[];
  instalacionId: string;
  onInstalacion: (id: string) => void;
  instOpciones: { valor: string; etiqueta: string }[];
  onBuscarInstalacion: (q: string) => Promise<{ valor: string; etiqueta: string }[]>;
  error?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Tipo" htmlFor="nt-tipo">
        <Select
          valor={tipoId}
          opciones={tipos.map((t) => ({
            valor: t.id,
            etiqueta: t.nombre,
            ...(t.descripcion ? { descripcion: t.descripcion } : {}),
          }))}
          onCambiar={onTipo}
        />
      </Campo>
      {tipo?.requiereAprobacion ? (
        <p className="t-caption">Este tipo pasa por aprobación antes de resolverse.</p>
      ) : null}
      <Campo etiqueta="Título" htmlFor="nt-titulo" {...(error ? { error } : {})}>
        <Input id="nt-titulo" value={titulo} maxLength={140} onChange={(e) => onTitulo(e.target.value)} />
      </Campo>
      <Campo etiqueta="Descripción" htmlFor="nt-desc">
        <Textarea
          id="nt-desc"
          rows={5}
          maxLength={4000}
          value={descripcion}
          onChange={(e) => onDescripcion(e.target.value)}
        />
      </Campo>
      {instalaciones.length > 0 ? (
        <Campo etiqueta="Instalación (opcional)" htmlFor="nt-inst">
          <Combobox
            id="nt-inst"
            valor={instalacionId}
            onCambiar={([v]) => onInstalacion(v ?? SIN_INSTALACION)}
            opciones={instOpciones}
            onBuscar={onBuscarInstalacion}
            placeholder="Sin instalación"
          />
        </Campo>
      ) : null}
      <Campo etiqueta="Prioridad" htmlFor="nt-prio">
        <Select valor={prioridad} opciones={PRIORIDADES} onCambiar={onPrioridad} />
      </Campo>
    </div>
  );
}