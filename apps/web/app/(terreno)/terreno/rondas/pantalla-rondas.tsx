"use client";

import { useCallback, useEffect, useState } from "react";

import { Alerta, Button, Empty, Loading } from "@opai/ds";
import { LinkNext } from "@/app/_components/link-next";

import { encolarHecho } from "@/lib/terreno/cola";
import { usePersonaElegida } from "@/lib/terreno/persona";

import { ListaPlantillas } from "./lista-plantillas";
import { RondaActiva } from "./ronda-activa";
import { type EstadoRondas, guardarRondaLocal, leerRondaLocal, type RondaLocal } from "./tipos";

/**
 * «Mis rondas» del equipo de terreno (CAR-78 · E3e): iniciar una ronda, marcar sus puntos y cerrarla. Todo se guarda
 * primero en el teléfono (cola) y se envía solo; los puntos «marcados» son los que el servidor ya recibió.
 */
export function PantallaRondas() {
  const persona = usePersonaElegida();
  const [estado, setEstado] = useState<EstadoRondas | null>(null);
  const [falla, setFalla] = useState(false);
  const [version, setVersion] = useState(0);
  const [local, setLocal] = useState<RondaLocal | null>(() => leerRondaLocal());
  const [aviso, setAviso] = useState<"cierre" | "error" | null>(null);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/terreno/rondas/estado", { cache: "no-store", credentials: "same-origin" })
      .then((r) =>
        r.ok ? (r.json() as Promise<EstadoRondas>) : Promise.reject(new Error(String(r.status))),
      )
      .then((x) => {
        if (!vivo) return;
        setEstado(x);
        setFalla(false);
      })
      .catch(() => vivo && setFalla(true));
    return () => {
      vivo = false;
    };
  }, [version]);
  useEffect(() => {
    const cada = window.setInterval(recargar, 15_000);
    window.addEventListener("online", recargar);
    return () => {
      window.clearInterval(cada);
      window.removeEventListener("online", recargar);
    };
  }, [recargar]);

  if (persona === undefined) return null;
  const marco = "mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 pt-safe pb-safe";
  if (!persona) {
    return (
      <main className={marco}>
        <Alerta tono="warning" titulo="Elige tu nombre primero">
          Las rondas necesitan saber quién las hace.
        </Alerta>
        <LinkNext href="/terreno" className="font-medium underline">
          Volver al inicio
        </LinkNext>
      </main>
    );
  }
  // La ronda en curso: la que se inició en este teléfono o, si no hay, la primera que el servidor ve abierta.
  const abierta =
    estado?.abiertas.find((a) => a.clave === local?.clave) ??
    (local ? undefined : estado?.abiertas[0]);
  const clave = local?.clave ?? abierta?.clave ?? null;
  const plantillaId = local?.plantillaId ?? abierta?.plantillaId ?? null;
  const plantilla = estado?.plantillas.find((p) => p.id === plantillaId) ?? null;

  const iniciar = async (id: string) => {
    setAviso(null);
    try {
      const { clave: nueva } = await encolarHecho({
        tipo: "rondas.inicio",
        payload: { plantillaId: id },
        personaId: persona.id,
      });
      const r = { clave: nueva, plantillaId: id };
      guardarRondaLocal(r);
      setLocal(r);
    } catch {
      setAviso("error");
    }
  };
  const cerrada = () => {
    guardarRondaLocal(null);
    setLocal(null);
    setAviso("cierre");
    recargar();
  };
  return (
    <main className={marco}>
      <h1 className="t-title text-fg">Mis rondas</h1>
      {!estado && !falla ? <Loading variante="lista" /> : null}
      {estado && !estado.activo ? (
        <Empty
          titulo="Rondas no está activo"
          descripcion="Pide al administrador que lo active para tu empresa."
        />
      ) : null}
      {falla ? (
        <Alerta
          tono="warning"
          titulo={estado ? "No se pudo actualizar" : "No se pudieron cargar las rondas"}
          accion={
            <Button variant="secondary" onClick={recargar}>
              Reintentar
            </Button>
          }
        >
          {estado ? "Lo que ves puede estar desactualizado." : "Revisa tu conexión."}
        </Alerta>
      ) : null}
      {aviso === "cierre" ? (
        <Alerta tono="success" titulo="Cierre guardado en el teléfono">
          Se envía solo cuando haya conexión; el servidor dirá si quedó completa o incompleta.
        </Alerta>
      ) : null}
      {aviso === "error" ? (
        <Alerta tono="danger" titulo="No se pudo guardar el inicio">
          No quedó en el teléfono. Vuelve a intentarlo.
        </Alerta>
      ) : null}
      {estado?.activo && clave && plantilla ? (
        <RondaActiva
          plantilla={plantilla}
          clave={clave}
          marcados={new Set(abierta?.marcados ?? [])}
          personaId={persona.id}
          alCerrar={cerrada}
        />
      ) : null}
      {estado?.activo && !clave ? (
        <ListaPlantillas plantillas={estado.plantillas} alIniciar={(id) => void iniciar(id)} />
      ) : null}
    </main>
  );
}
