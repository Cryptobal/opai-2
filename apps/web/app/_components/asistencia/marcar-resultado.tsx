import { Check } from "lucide-react";

import { Card } from "@opai/ds";

import { GPS, METODO, TIPO_MARCA } from "./etiquetas";

export type MarcaListo = {
  tipo: string; horaServidor: string; metodo: string; gpsEstado: string; distanciaM: number | null; hash: string; repetida?: boolean;
};

/** Estado «Marca registrada» (Marcación · listo): hora del servidor, método, ubicación y código de comprobante. */
export function MarcarResultado({ m, instalacion }: { m: MarcaListo; instalacion: string }) {
  const hora = new Date(m.horaServidor).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const filas: [string, string][] = [
    ["Instalación", instalacion],
    ["Método", METODO[m.metodo] ?? m.metodo],
    ["Ubicación", `${GPS[m.gpsEstado] ?? m.gpsEstado}${m.distanciaM !== null ? ` · ${Math.round(m.distanciaM)} m` : ""}`],
  ];
  return (
    <div className="flex flex-col gap-5" role="status">
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <span className="flex size-[72px] items-center justify-center rounded-[20px] bg-success-muted text-success-fg"><Check className="size-8" aria-hidden /></span>
        <h2 className="t-title text-fg">{TIPO_MARCA[m.tipo] ?? m.tipo} marcada</h2>
        <p className="t-body-sm text-fg-muted t-numeric">Hora del servidor · {hora}</p>
      </div>
      <Card>
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-border px-4 py-3.5">
            <span className="t-body-sm text-fg-muted">{k}</span>
            <span className="t-label t-numeric text-right text-fg">{v}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3 px-4 py-3.5">
          <span className="t-body-sm text-fg-muted">Comprobante</span>
          <span className="t-mono t-label text-fg">{m.hash.slice(0, 12)}</span>
        </div>
      </Card>
      <p className="t-caption text-fg-muted text-center">El comprobante completo llega a tu correo personal.</p>
    </div>
  );
}
