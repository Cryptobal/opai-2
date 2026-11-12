import { Alerta } from "@opai/ds";

import { MOTIVOS } from "./tipos";

/** Resultado de la vuelta de Slack. Solo códigos conocidos: nunca texto que venga en la URL. */
export function ResultadoConexion({ slack, motivo }: { slack?: string; motivo?: string }) {
  if (slack === "conectado") {
    return (
      <Alerta tono="success" titulo="Slack quedó conectado">
        <p className="t-body-sm">
          Elige el canal de los avisos e invita a la app «OPAI» a ese canal.
        </p>
      </Alerta>
    );
  }
  if (slack !== "error") return null;
  return (
    <Alerta tono="danger" titulo="No se pudo conectar Slack">
      <p className="t-body-sm">
        {MOTIVOS[motivo ?? ""] ?? "Slack no respondió como se esperaba. Intenta de nuevo."}
      </p>
    </Alerta>
  );
}
