"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Campo, CampoSecreto, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Integracion } from "./tipos";

type Secreto = Integracion["secretos"][number];

/**
 * API key de SimpleAPI de Emisión DTE. La capacidad no guarda la key de 20 caracteres sin guiones (CAR-240: SimpleAPI
 * la rechaza con 401); el motivo queda bajo el campo, que conserva lo escrito para corregirlo.
 */
export function ApiKeySimpleApi({ proveedor, apiKey }: { proveedor: string; apiKey: Secreto }) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [fallo, setFallo] = useState(false);

  return (
    <SeccionTarjeta titulo="SimpleAPI">
      <Campo
        etiqueta={apiKey.etiqueta}
        htmlFor="dte-api-key"
        ayuda="Cópiala con guiones, tal como la muestra el panel de SimpleAPI: XXXX-XXXX-XXXX-XXXX-XXXX (24 caracteres)."
      >
        <CampoSecreto
          id="dte-api-key"
          aria-label={apiKey.etiqueta}
          guardado={apiKey.mascara ? apiKey.mascara.slice(-4) : null}
          pendiente={pendiente}
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
          error={fallo ? (error ?? "No se pudo guardar la credencial.") : null}
          onGuardar={async (valor) => {
            setFallo(false);
            const r = await ejecutar("core.integraciones.set_secreto", { proveedor, nombre: "api_key", valor });
            if (!r) {
              setFallo(true);
              return false;
            }
            avisar.exito("Credencial guardada cifrada");
            router.refresh();
            return true;
          }}
        />
      </Campo>
    </SeccionTarjeta>
  );
}
