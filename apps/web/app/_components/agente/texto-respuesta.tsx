import { Fragment } from "react";

import { bloquesNovedad, type TrozoNovedad } from "@opai/domain";
import { Enlace } from "@opai/ds";

import { hrefOpai } from "./href-opai";
import type { ReferenciaEntidad } from "./tipos";

/**
 * Respuesta del agente con markdown seguro (CAR-446): negrita, listas y enlaces solo a rutas
 * internas que salieron de las capacidades (`referencias`). Sin HTML crudo.
 */
function Trozos({
  trozos,
  permitidos,
}: {
  trozos: readonly TrozoNovedad[];
  permitidos: ReadonlySet<string>;
}) {
  return trozos.map((t, i) => {
    if (t.tipo === "texto") return <Fragment key={i}>{t.texto}</Fragment>;
    if (t.tipo === "codigo")
      return (
        <code key={i} className="t-mono rounded-sm bg-fill px-1 text-sm text-fg">
          {t.texto}
        </code>
      );
    if (t.tipo === "negrita")
      return (
        <strong key={i} className="font-semibold">
          <Trozos trozos={t.trozos} permitidos={permitidos} />
        </strong>
      );
    if (t.tipo === "cursiva")
      return (
        <em key={i}>
          <Trozos trozos={t.trozos} permitidos={permitidos} />
        </em>
      );
    const href = hrefOpai(t.href);
    if (!href || !permitidos.has(href))
      return (
        <Fragment key={i}>
          <Trozos trozos={t.trozos} permitidos={permitidos} />
        </Fragment>
      );
    return (
      <Enlace key={i} href={href} className="inline min-h-0">
        <Trozos trozos={t.trozos} permitidos={permitidos} />
      </Enlace>
    );
  });
}

export function TextoRespuesta({
  texto,
  referencias = [],
}: {
  texto: string;
  referencias?: readonly ReferenciaEntidad[];
}) {
  const permitidos = new Set(referencias.map((r) => r.href).filter((h) => hrefOpai(h)));
  const bloques = bloquesNovedad(texto);
  return (
    <div className="text-md flex flex-col gap-2 break-words text-fg">
      {bloques.map((b, i) => {
        if (b.tipo === "titulo" || b.tipo === "parrafo")
          return (
            <p key={i} className={b.tipo === "titulo" ? "t-label" : undefined}>
              <Trozos trozos={b.trozos} permitidos={permitidos} />
            </p>
          );
        const Lista = b.ordenada ? "ol" : "ul";
        return (
          <Lista
            key={i}
            className={`${b.ordenada ? "list-decimal" : "list-disc"} flex flex-col gap-1 pl-5`}
          >
            {b.items.map((item, j) => (
              <li key={j}>
                <Trozos trozos={item} permitidos={permitidos} />
              </li>
            ))}
          </Lista>
        );
      })}
    </div>
  );
}
