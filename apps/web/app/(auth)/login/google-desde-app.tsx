"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@opai/ds";

import { escucharVueltaApp, iniciarGoogleEnApp } from "@/lib/app-nativa-cliente";

/**
 * «Continuar con Google» dentro de la app nativa (CAR-516): Google no permite su ingreso en vistas
 * web embebidas, así que se abre en el navegador del sistema y se vuelve por `cl.opai.app://canje`.
 */
export function GoogleDesdeApp({ deshabilitado }: { deshabilitado: boolean }) {
  const [abriendo, setAbriendo] = useState(false);
  const router = useRouter();
  useEffect(() => escucharVueltaApp((ruta) => router.push(ruta)), [router]);
  const abrir = async () => {
    setAbriendo(true);
    if (!(await iniciarGoogleEnApp())) setAbriendo(false);
  };
  return (
    <Button
      variant="secondary"
      size="lg"
      block
      disabled={deshabilitado}
      cargando={abriendo}
      onClick={() => void abrir()}
    >
      Continuar con Google
    </Button>
  );
}
