"use client";

import { Button, Campo, Select, Textarea } from "@opai/ds";

type Props = {
  usuarios: { userId: string; nombre: string }[];
  entregaA: string;
  notaEntrega: string;
  pendiente: boolean;
  onEntregaA: (v: string) => void;
  onNota: (v: string) => void;
  onEntregar: () => void;
};

export function PanelEntregaTurno({ usuarios, entregaA, notaEntrega, pendiente, onEntregaA, onNota, onEntregar }: Props) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <h3 className="t-label text-fg">Entregar turno</h3>
      <Select
        valor={entregaA}
        onCambiar={onEntregaA}
        opciones={[{ valor: "", etiqueta: "Elegir persona" }, ...usuarios.map((u) => ({ valor: u.userId, etiqueta: u.nombre }))]}
      />
      <Campo etiqueta="Nota de entrega">
        <Textarea value={notaEntrega} onChange={(e) => onNota(e.target.value)} rows={3} />
      </Campo>
      <Button variant="secondary" disabled={pendiente || !entregaA} onClick={onEntregar}>
        Entregar turno
      </Button>
    </section>
  );
}