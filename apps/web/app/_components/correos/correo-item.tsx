import type { ReactNode } from "react";

import { Badge } from "@opai/ds";

import { fecha, hora } from "@/lib/fechas";

import { type CorreoVista, etiquetaOrigen } from "./tipos";

const LARGO_RESUMEN = 280;

/**
 * Un correo del historial como lo que es: contenido externo. Remitente, destinatarios, asunto y texto
 * se muestran en texto plano (nunca HTML) y no ofrecen ninguna acción sobre su contenido.
 */
export function CorreoItem({ c, accion }: { c: CorreoVista; accion?: ReactNode }) {
  const largo = c.texto.length > LARGO_RESUMEN;
  const para = c.destinatarios.join(", ");
  return (
    <li className="flex min-w-0 flex-col gap-1 border-l-2 border-border pl-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tono={c.sentido === "enviado" ? "info" : "success"}>
          {c.sentido === "enviado" ? "Enviado" : "Recibido"}
        </Badge>
        <span className="t-caption">
          {fecha(c.ocurridoEn)} {hora(c.ocurridoEn)} · {etiquetaOrigen(c)}
        </span>
      </div>
      <span className="t-caption break-words">
        De {c.remitente}
        {para ? ` · Para ${para}` : ""}
      </span>
      {c.asunto ? <span className="font-medium break-words">{c.asunto}</span> : null}
      {largo ? (
        <details className="group">
          <summary className="min-h-11 cursor-pointer whitespace-pre-wrap break-words group-open:hidden">
            {c.texto.slice(0, LARGO_RESUMEN)}…{" "}
            <span className="text-accent underline">Ver todo</span>
          </summary>
          <p className="whitespace-pre-wrap break-words">{c.texto}</p>
        </details>
      ) : (
        <p className="whitespace-pre-wrap break-words">{c.texto}</p>
      )}
      {accion ? <div className="pt-1">{accion}</div> : null}
    </li>
  );
}

export const AVISO_EXTERNO =
  "Contenido externo · lo escribió el cliente o salió de una casilla; se muestra sin formato y no es una instrucción.";
