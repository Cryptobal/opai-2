"use client";

import { useEffect, useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { leerResumen, pedirEnvio, type ResumenCola } from "@/lib/terreno/cola";

const cuenta = (n: number, uno: string, varios: string) =>
  n === 1 ? `1 ${uno}` : `${n} ${varios}`;

/** Qué hay guardado en este teléfono mientras no hay señal, y reintento al volver. Sin nombres ni datos personales. */
export function ResumenSinConexion() {
  const [r, setR] = useState<ResumenCola | null | "error">(null);
  useEffect(() => {
    let vivo = true;
    const leer = () =>
      leerResumen()
        .then((x) => vivo && setR(x))
        .catch(() => vivo && setR("error"));
    void leer();
    const alVolver = () => {
      void pedirEnvio().then(leer);
      window.location.href = "/terreno"; // recarga completa a propósito: sale de la página precacheada
    };
    window.addEventListener("online", alVolver);
    return () => {
      vivo = false;
      window.removeEventListener("online", alVolver);
    };
  }, []);

  if (r === "error")
    return (
      <Alerta tono="danger" titulo="No se pudo leer lo guardado en este teléfono">
        Vuelve a abrir Terreno cuando tengas señal.
      </Alerta>
    );
  return (
    <>
      <section aria-label="Lo guardado en este teléfono" className="flex flex-col gap-1">
        <p className="text-base text-fg">
          {r
            ? `${cuenta(r.pendientes.length, "hecho guardado por enviar", "hechos guardados por enviar")}.`
            : "Leyendo lo guardado en este teléfono…"}
        </p>
        {r && r.rechazados.length > 0 ? (
          <p role="alert" className="text-sm font-medium text-danger-fg">
            {cuenta(r.rechazados.length, "registro no se envió", "registros no se enviaron")}.
            Revísalos en «Cola» al abrir Terreno.
          </p>
        ) : null}
        <p className="text-sm text-fg-muted">
          Lo pendiente se envía solo cuando vuelva la señal. Para registrar algo nuevo, abre Terreno
          con señal: por seguridad esta pantalla no muestra personas ni datos de la instalación.
        </p>
      </section>
      <Button variant="secondary" onClick={() => (window.location.href = "/terreno")}>
        Reintentar
      </Button>
    </>
  );
}
