"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { escucharVueltaApp, iniciarGoogleEnApp } from "@/lib/app-nativa-cliente";

/**
 * «Continuar con Google» dentro de la app nativa (CAR-516): Google no permite su ingreso en vistas
 * web embebidas, así que se abre en el navegador del sistema y se vuelve por `cl.opai.app://canje`.
 */
export function GoogleDesdeApp({ deshabilitado }: { deshabilitado: boolean }) {
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  useEffect(() => escucharVueltaApp((ruta) => router.push(ruta)), [router]);
  const abrir = async () => {
    setAbriendo(true);
    setError(false);
    try {
      setError(!(await iniciarGoogleEnApp()));
    } catch {
      setError(true);
    } finally {
      setAbriendo(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <Alerta tono="danger" titulo="No pudimos abrir Google">
          Prueba de nuevo o entra con tu correo y contraseña.
        </Alerta>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        block
        disabled={deshabilitado || abriendo}
        cargando={abriendo}
        onClick={() => void abrir()}
      >
        Continuar con Google
      </Button>
    </div>
  );
}
