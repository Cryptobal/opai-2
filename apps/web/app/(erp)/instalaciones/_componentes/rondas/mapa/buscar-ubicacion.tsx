"use client";

import { Loader2, MapPin } from "lucide-react";
import { useState } from "react";

import { Button, Combobox, type OpcionCombobox } from "@opai/ds";

type Props = {
  onElegir: (lat: number, lng: number) => void;
  onMiUbicacion: () => void;
  buscandoGps: boolean;
};

export function BuscarUbicacion({ onElegir, onMiUbicacion, buscandoGps }: Props) {
  const [opciones, setOpciones] = useState<readonly OpcionCombobox[]>([]);
  const buscar = async (texto: string) => {
    if (texto.trim().length < 3) {
      setOpciones([]);
      return [];
    }
    const r = await fetch(`/api/geo/buscar?q=${encodeURIComponent(texto.trim())}`);
    const j = (await r.json()) as {
      ok: boolean;
      data?: { lat: number; lng: number; etiqueta: string }[];
    };
    const lista =
      j.ok && j.data
        ? j.data.map((s, i) => ({
            valor: `${s.lat},${s.lng},${i}`,
            etiqueta: s.etiqueta,
          }))
        : [];
    setOpciones(lista);
    return lista;
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <Combobox
          id="mapa-buscar-dir"
          aria-label="Buscar dirección"
          placeholder="Calle, número o lugar"
          textoInicial="Escribe al menos 3 caracteres"
          opciones={opciones}
          onBuscar={buscar}
          onCambiar={(vals) => {
            const v = vals[0];
            if (!v) return;
            const [lat, lng] = v.split(",");
            const a = Number.parseFloat(lat ?? "");
            const b = Number.parseFloat(lng ?? "");
            if (Number.isFinite(a) && Number.isFinite(b)) onElegir(a, b);
          }}
        />
      </div>
      <Button type="button" variant="secondary" className="shrink-0" onClick={onMiUbicacion} disabled={buscandoGps}>
        {buscandoGps ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
        Usar mi ubicación
      </Button>
    </div>
  );
}