"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@opai/ds";

import { ProponerCorreccion } from "./proponer-correccion";

export function BotonProponerCorreccion({ personaId, nombre, fecha }: {
  personaId: string;
  nombre: string;
  fecha: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>Proponer corrección</Button>
      {abierto ? (
        <ProponerCorreccion
          abierto
          onCerrar={() => setAbierto(false)}
          onListo={() => router.refresh()}
          personaId={personaId}
          personaNombre={nombre}
          desde={fecha}
          hasta={fecha}
        />
      ) : null}
    </>
  );
}
