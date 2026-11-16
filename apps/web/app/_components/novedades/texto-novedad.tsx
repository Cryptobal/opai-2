import { bloquesNovedad, trozosNovedad } from "@opai/domain";

import { BloqueVista, TrozosNovedad } from "./bloque-novedad";

/**
 * Texto de una novedad con su formato (CAR-316 / CAR-525): negrita, cursiva, listas, tablas y
 * enlaces. Nunca `dangerouslySetInnerHTML`.
 */
export function TextoNovedad({
  texto,
  enlaceOk,
  className = "t-body flex flex-col gap-2 text-fg",
}: {
  texto: string;
  enlaceOk?: (href: string) => boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {bloquesNovedad(texto).map((b, i) => (
        <BloqueVista key={i} b={b} enlaceOk={enlaceOk} />
      ))}
    </div>
  );
}

/** Primera línea del texto, con formato en línea (aviso destacado). */
export function LineaNovedad({ texto }: { texto: string }) {
  const primera = texto.split(/\n\s*\n/)[0]?.replace(/\s*\n\s*/g, " ") ?? "";
  return <TrozosNovedad trozos={trozosNovedad(primera)} />;
}
