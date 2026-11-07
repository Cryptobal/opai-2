"use client";

import { useCallback, useEffect, useState } from "react";

import { Alerta, Button, Empty, Loading } from "@opai/ds";
import { LinkNext } from "@/app/_components/link-next";

import { usePersonaElegida } from "@/lib/terreno/persona";

import { FormularioEntrada } from "./formulario-entrada";
import { ListaEnSitio, type EnSitio } from "./lista-en-sitio";

type Sitio = { activo: boolean; items: EnSitio[] };

/**
 * Portería del equipo de terreno (CAR-78 · E4d): registrar entrada y salida. Lo que se registra queda primero en el
 * teléfono (cola) y se envía solo; «En sitio» muestra lo que el servidor ya tiene. Sin conexión no inventa nada.
 */
export function PantallaPorteria() {
  const persona = usePersonaElegida();
  const [sitio, setSitio] = useState<Sitio | null>(null);
  const [falla, setFalla] = useState(false);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/terreno/porteria/sitio", { cache: "no-store", credentials: "same-origin" })
      .then((r) =>
        r.ok ? (r.json() as Promise<Sitio>) : Promise.reject(new Error(String(r.status))),
      )
      .then((x) => {
        if (!vivo) return;
        setSitio(x);
        setFalla(false);
      })
      .catch(() => vivo && setFalla(true));
    return () => {
      vivo = false;
    };
  }, [version]);
  useEffect(() => {
    const cada = window.setInterval(recargar, 30_000);
    window.addEventListener("online", recargar);
    return () => {
      window.clearInterval(cada);
      window.removeEventListener("online", recargar);
    };
  }, [recargar]);

  if (persona === undefined) return null;
  if (!persona) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 pt-safe pb-safe">
        <Alerta tono="warning" titulo="Elige tu nombre primero">
          La portería necesita saber quién registra.
        </Alerta>
        <LinkNext href="/terreno" className="font-medium underline">
          Volver al inicio
        </LinkNext>
      </main>
    );
  }
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 pt-safe pb-safe">
      <h1 className="t-title text-fg">Portería</h1>
      {!sitio && !falla ? <Loading variante="lista" /> : null}
      {sitio && !sitio.activo ? (
        <Empty
          titulo="Control de acceso no está activo"
          descripcion="Pide al administrador que lo active para tu empresa."
        />
      ) : null}
      {falla ? (
        <Alerta
          tono="warning"
          titulo={sitio ? "No se pudo actualizar" : "No se pudo cargar quién está en sitio"}
          accion={
            <Button variant="secondary" onClick={recargar}>
              Reintentar
            </Button>
          }
        >
          {sitio
            ? "Lo que ves puede estar desactualizado."
            : "Revisa tu conexión. Igual puedes registrar: queda guardado en el teléfono."}
        </Alerta>
      ) : null}
      {!sitio || sitio.activo ? (
        <>
          <FormularioEntrada personaId={persona.id} />
          {sitio ? <ListaEnSitio items={sitio.items} personaId={persona.id} /> : null}
        </>
      ) : null}
    </main>
  );
}
