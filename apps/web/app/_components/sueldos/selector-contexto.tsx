"use client";

import { lazy, Suspense, useState } from "react";
import { Button, Loading } from "@opai/ds";

const Campos = lazy(() =>
  import("./selector-contexto-campos").then((m) => ({ default: m.SelectorContexto })),
);
type Props = {
  fecha: string;
  instalaciones: { id: string; nombre: string }[];
  puestos: { id: string; nombre: string; instalacionId: string }[];
};
export function SelectorContexto(props: Props) {
  const [abierto, abrir] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" aria-expanded={abierto} onClick={() => abrir(!abierto)}>
        Resolver al {props.fecha} · cambiar contexto
      </Button>
      {abierto ? (
        <Suspense fallback={<Loading variante="detalle" />}>
          <Campos {...props} />
        </Suspense>
      ) : null}
    </div>
  );
}
