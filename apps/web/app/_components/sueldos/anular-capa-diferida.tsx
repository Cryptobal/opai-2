"use client";

import { lazy, Suspense, useRef, useState } from "react";
import { Button } from "@opai/ds";

const AnularCapa = lazy(() => import("./anular-capa").then((m) => ({ default: m.AnularCapa })));

export function AnularCapaDiferida({ id }: { id: string }) {
  const [abierto, abrir] = useState(false);
  const disparador = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={disparador}><Button variant="ghost" onClick={() => abrir(true)}>Anular versión</Button></div>
      {abierto ? (
        <Suspense fallback={<span role="status">Cargando…</span>}>
          <AnularCapa id={id} alCerrar={() => { abrir(false); disparador.current?.querySelector("button")?.focus(); }} />
        </Suspense>
      ) : null}
    </>
  );
}
