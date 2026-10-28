"use client";

import { lazy, Suspense, useState } from "react";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "../use-capacidad";

// El diálogo se descarga al abrirlo: no pesa en el JS inicial de la ficha (ADR-037).
const DialogoConfirmar = lazy(() =>
  import("../maestros/dialogo-confirmar").then((m) => ({ default: m.DialogoConfirmar })),
);

type Props = { titular: { tipo: string; id: string }; proposito: string; nombre: string };

/** Revocar un consentimiento vigente: agrega un hecho nuevo, no edita el anterior (append-only). */
export function RevocarConsentimiento({ titular, proposito, nombre }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setAbierto(true)}>
        Revocar
      </Button>
      {abierto ? (
        <Suspense fallback={null}>
          <DialogoConfirmar
            confirmacion={{
              titulo: `Revocar «${nombre}»`,
              descripcion:
                "Los tratamientos cuya única base era este consentimiento cesan desde ahora.",
              boton: "Revocar",
              peligro: true,
              motivo: true,
            }}
            pendiente={pendiente}
            error={error}
            onCerrar={() => setAbierto(false)}
            onConfirmar={async (nota) => {
              if (
                !(await ejecutar("core.cumplimiento.consentimiento_revocar", {
                  titular,
                  proposito,
                  nota,
                }))
              )
                return;
              avisar.exito("Consentimiento revocado");
              setAbierto(false);
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
