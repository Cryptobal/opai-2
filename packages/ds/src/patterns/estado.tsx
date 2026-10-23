import type { ReactNode } from "react";

import { Button } from "../components/button";
import { Empty, ErrorState, Forbidden, Loading, type VarianteLoading } from "../states";

export type EstadoPantalla = "loading" | "empty" | "error" | "forbidden" | "ready";

export type TextosEstado = {
  vacio?: { titulo: string; descripcion?: string; accion?: ReactNode };
  error?: { titulo?: string; descripcion?: string; onReintentar?: () => void };
};

type Props = {
  state: EstadoPantalla;
  variante: VarianteLoading;
  textos?: TextosEstado;
  children: ReactNode;
};

/** Resuelve los cuatro estados estándar; en `ready` renderiza el contenido. */
export function Estado({ state, variante, textos, children }: Props) {
  if (state === "loading") return <Loading variante={variante} />;
  if (state === "forbidden") return <Forbidden />;
  if (state === "error") {
    const e = textos?.error;
    return (
      <ErrorState
        titulo={e?.titulo ?? "No pudimos cargar esta información"}
        descripcion={e?.descripcion ?? "Revisa tu conexión e inténtalo de nuevo."}
        {...(e?.onReintentar
          ? {
              accion: (
                <Button variant="secondary" onClick={e.onReintentar}>
                  Reintentar
                </Button>
              ),
            }
          : {})}
      />
    );
  }
  if (state === "empty") {
    const v = textos?.vacio;
    return (
      <Empty
        titulo={v?.titulo ?? "Aún no hay registros"}
        {...(v?.descripcion ? { descripcion: v.descripcion } : {})}
        {...(v?.accion ? { accion: v.accion } : {})}
      />
    );
  }
  return <>{children}</>;
}

export function Cabecera({
  titulo,
  subtitulo,
  acciones,
}: {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-fg md:text-2xl">{titulo}</h2>
        {subtitulo ? <p className="mt-0.5 text-base text-fg-muted">{subtitulo}</p> : null}
      </div>
      {acciones ? <div className="flex shrink-0 items-center gap-2">{acciones}</div> : null}
    </div>
  );
}
