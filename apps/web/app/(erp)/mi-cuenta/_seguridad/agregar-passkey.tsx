"use client";

import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@opai/ds";

import { useSoportaPasskeys } from "@/app/_components/webauthn";

// La hoja y la ceremonia WebAuthn se descargan al tocar el botón (presupuesto de JS, ADR-037).
const HojaAgregarPasskey = dynamic(() =>
  import("./hoja-agregar-passkey").then((m) => m.HojaAgregarPasskey),
);

/** Botón «Agregar passkey» (CAR-286); oculto si el navegador no admite passkeys. */
export function AgregarPasskey({ primera }: { primera: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const soporta = useSoportaPasskeys();
  if (!soporta)
    return <p className="text-sm text-fg-muted">Este navegador no permite usar passkeys.</p>;
  return (
    <>
      <Button variant={primera ? "primary" : "secondary"} onClick={() => setAbierto(true)}>
        <Plus aria-hidden className="size-4" />
        Agregar passkey
      </Button>
      {abierto ? <HojaAgregarPasskey onCerrar={() => setAbierto(false)} /> : null}
    </>
  );
}
