"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input, Select } from "@opai/ds";

import { type FiltrosBandeja, hrefBandeja } from "./tipos";

/** Quién rinde y rango de fechas de envío. Cada cambio navega con los filtros en la URL (se puede compartir). */
export function FiltrosBandejaForm({
  filtros,
  personas,
}: {
  filtros: FiltrosBandeja;
  personas: readonly { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState(filtros);
  const ir = (n: FiltrosBandeja) => router.push(hrefBandeja(n));
  const cambiar = (parcial: Partial<FiltrosBandeja>) => {
    const n = { ...f, ...parcial };
    for (const k of ["solicitanteId", "desde", "hasta"] as const) if (!n[k]) delete n[k];
    setF(n);
    ir(n);
  };
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
      <Select
        aria-label="Quién rinde"
        valor={f.solicitanteId ?? ""}
        onCambiar={(v) => cambiar({ solicitanteId: v })}
        opciones={[{ valor: "", etiqueta: "Todas las personas" }, ...personas.map((p) => ({ valor: p.id, etiqueta: p.nombre }))]}
      />
      <Input type="date" aria-label="Enviada desde" value={f.desde ?? ""} onChange={(e) => cambiar({ desde: e.target.value })} />
      <Input type="date" aria-label="Enviada hasta" value={f.hasta ?? ""} onChange={(e) => cambiar({ hasta: e.target.value })} />
      <Button variant="secondary" onClick={() => { const n = { estado: f.estado }; setF(n); ir(n); }}>
        Limpiar
      </Button>
    </div>
  );
}
