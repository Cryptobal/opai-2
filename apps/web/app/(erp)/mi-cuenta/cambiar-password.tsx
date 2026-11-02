"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@opai/ds";

const CambiarPassword = dynamic(() =>
  import("@/app/_components/cambiar-password").then((m) => m.CambiarPassword),
);

export function PasswordCuenta() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Cambiar contraseña
      </Button>
      {abierto ? <CambiarPassword abierto onCerrar={() => setAbierto(false)} /> : null}
    </>
  );
}
