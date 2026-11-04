import { Badge, Card } from "@opai/ds";

import { cuandoCompleto } from "@/lib/fechas";

export type EnvioCliente = {
  id: string;
  estado: "enviado" | "fallido";
  destinatarios: string[];
  adjuntos: string[];
  error: string | null;
  enviadoEn: string;
};

/** Historial de envíos del documento al cliente. */
export function HistorialEnvios({ envios }: { envios: EnvioCliente[] }) {
  return (
    <Card className="p-4 flex flex-col gap-2">
      <h3 className="text-sm font-medium">Envíos al cliente</h3>
      {envios.length === 0 ? (
        <p className="text-sm text-fg-muted">Todavía no se ha enviado al cliente.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {envios.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0 break-words">
                {e.destinatarios.join(", ")} · {e.adjuntos.join(" + ").toUpperCase()}
                {e.error ? <span className="block text-fg-muted">{e.error}</span> : null}
              </span>
              <span className="flex items-center gap-2 text-fg-muted">
                {cuandoCompleto(e.enviadoEn)}
                <Badge tono={e.estado === "enviado" ? "success" : "danger"}>{e.estado === "enviado" ? "Enviado" : "Fallido"}</Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
