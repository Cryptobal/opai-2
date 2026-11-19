"use client";
import { lazy, Suspense, useRef, useState } from "react";
import { Button } from "@opai/ds";

const HojaPrerregistro = lazy(() =>
  import("./hoja-prerregistro").then((m) => ({ default: m.HojaPrerregistro })),
);

type Props = {
  instalaciones: { id: string; nombre: string }[];
  instalacionId?: string;
  hoy: string;
};

/** La hoja y sus controles se descargan al abrir, no al listar visitas. */
export function Prerregistrar(props: Props) {
  const disparador = useRef<HTMLButtonElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  return (
    <>
      <Button
        onClick={(e) => {
          disparador.current = e.currentTarget;
          setMontado(true);
          setAbierto(true);
        }}
      >
        Prerregistrar
      </Button>
      {montado ? (
        <Suspense fallback={<p role="status">Cargando formulario…</p>}>
          <HojaPrerregistro
            {...props}
            abierto={abierto}
            onCerrar={() => setAbierto(false)}
            onRestaurarFoco={() => disparador.current?.focus()}
          />
        </Suspense>
      ) : null}
    </>
  );
}
