"use client";

import { useEffect, useState } from "react";

import { Alerta, AuthCard, estilosBoton } from "@opai/ds";

import { accionCanjearApp } from "@/app/_acciones/app-nativa";
import { LinkNext } from "@/app/_components/link-next";
import { tomarVerificador } from "@/lib/app-nativa-cliente";

/** Canjea una sola vez al montar; si falla, ofrece volver al ingreso (el código ya no sirve). */
export function CanjeApp({ codigo }: { codigo: string }) {
  const [error, setError] = useState(false);
  useEffect(() => {
    const verificador = tomarVerificador();
    const canje =
      codigo && verificador
        ? accionCanjearApp(codigo, verificador)
        : Promise.resolve({ error: true });
    void canje.then((r) => setError(r.error));
  }, [codigo]);
  return (
    <AuthCard titulo="Entrando…" subtitulo="Volviste desde Google." Link={LinkNext}>
      {error ? (
        <>
          <Alerta tono="danger" titulo="No pudimos completar el ingreso">
            Vuelve a intentarlo desde el ingreso.
          </Alerta>
          <LinkNext href="/login" className={estilosBoton({ size: "lg", block: true })}>
            Volver al ingreso
          </LinkNext>
        </>
      ) : null}
    </AuthCard>
  );
}
