import { Fragment } from "react";

import { bloquesNovedad, trozosNovedad, type TrozoNovedad } from "@opai/domain";
import { Enlace } from "@opai/ds";

/**
 * Texto de una novedad con su formato (CAR-316): negrita, cursiva, listas y enlaces dibujados con
 * elementos de React. Nunca `dangerouslySetInnerHTML`: lo que no es una marca conocida queda como
 * texto escapado por React, y los enlaces solo aceptan rutas internas o https (`hrefSeguroNovedad`).
 */
function Trozos({ trozos }: { trozos: readonly TrozoNovedad[] }) {
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
          <Trozos trozos={t.trozos} />
        </strong>
      );
    if (t.tipo === "cursiva")
      return (
        <em key={i}>
          <Trozos trozos={t.trozos} />
        </em>
      );
    return (
      <Enlace key={i} href={t.href}>
        <Trozos trozos={t.trozos} />
      </Enlace>
    );
  });
}

export function TextoNovedad({ texto }: { texto: string }) {
  const bloques = bloquesNovedad(texto);
  return (
    <div className="t-body flex flex-col gap-2 text-fg">
      {bloques.map((b, i) => {
        if (b.tipo === "titulo")
          return (
            <p key={i} className="t-label text-fg">
              <Trozos trozos={b.trozos} />
            </p>
          );
        if (b.tipo === "parrafo")
          return (
            <p key={i}>
              <Trozos trozos={b.trozos} />
            </p>
          );
        const Lista = b.ordenada ? "ol" : "ul";
        return (
          <Lista key={i} className={`${b.ordenada ? "list-decimal" : "list-disc"} flex flex-col gap-1 pl-5`}>
            {b.items.map((item, j) => (
              <li key={j}>
                <Trozos trozos={item} />
              </li>
            ))}
          </Lista>
        );
      })}
    </div>
  );
}

/** Primera línea del texto, con formato en línea (aviso destacado). */
export function LineaNovedad({ texto }: { texto: string }) {
  const primera = texto.split(/\n\s*\n/)[0]?.replace(/\s*\n\s*/g, " ") ?? "";
  return <Trozos trozos={trozosNovedad(primera)} />;
}
