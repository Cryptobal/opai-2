"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Alerta, Button, Campo, Input } from "@opai/ds";

import { encolarHecho } from "@/lib/terreno/cola";

// El lector de la cámara se carga solo si el navegador lo soporta, para no pesar en el JS inicial.
const EscanearQr = dynamic(() => import("./escanear-qr").then((m) => m.EscanearQr), { ssr: false });

type Lectura = { lat: number; lng: number; precisionM: number };

/** Una lectura GPS puntual; sin permiso o sin señal devuelve null: el GPS suma, nunca bloquea (R2). */
function leerGps(): Promise<Lectura | null> {
  return new Promise((ok) => {
    if (!("geolocation" in navigator)) return ok(null);
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisionM: p.coords.accuracy }),
      () => ok(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
    );
  });
}

/**
 * «Marcar punto» (CAR-78 · E3b): el guardia lee el código del QR del punto y la marca queda en el teléfono.
 * Se dice «guardada» solo cuando la cola releyó el hecho del disco; el servidor decide a qué punto
 * corresponde y rechaza el QR de otra instalación (se ve en la cola). No marca presencia laboral.
 */
export function MarcarPunto({
  personaId,
  ejecucionClave,
}: {
  personaId: string;
  /** Clave del inicio de la ronda a la que pertenece la marca (opcional: sin ella la marca queda suelta). */
  ejecucionClave?: string;
}) {
  const [codigo, setCodigo] = useState("");
  // Este componente solo se monta en el navegador (carga diferida sin servidor): se puede consultar de una vez.
  const camara = "BarcodeDetector" in window && !!navigator.mediaDevices;
  const [estado, setEstado] = useState<"libre" | "guardando" | "guardada" | "error">("libre");

  const marcar = async () => {
    const c = codigo.trim();
    if (!c) return;
    setEstado("guardando");
    try {
      const lectura = await leerGps();
      await encolarHecho({
        tipo: "rondas.marca",
        payload: {
          codigo: c,
          ...(ejecucionClave ? { ejecucionClave } : {}),
          ...(lectura ? { lectura } : {}),
        },
        personaId,
      });
      setCodigo("");
      setEstado("guardada");
    } catch {
      setEstado("error");
    }
  };

  return (
    <section aria-label="Marcar punto" className="flex flex-col gap-2">
      <h2 className="t-heading text-fg">Marcar punto</h2>
      {camara ? (
        <EscanearQr
          alLeer={(c) => {
            setCodigo(c);
            setEstado("libre");
          }}
        />
      ) : null}
      <Campo etiqueta="Código del punto (QR)" htmlFor="m-codigo">
        <Input
          id="m-codigo"
          value={codigo}
          maxLength={200}
          autoComplete="off"
          onChange={(e) => {
            setCodigo(e.target.value);
            setEstado("libre");
          }}
        />
      </Campo>
      <Button onClick={() => void marcar()} disabled={!codigo.trim() || estado === "guardando"}>
        {estado === "guardando" ? "Guardando…" : "Marcar"}
      </Button>
      {estado === "guardada" ? (
        <Alerta tono="success" titulo="Marca guardada en el teléfono">
          Se envía sola cuando haya conexión. Revisa «Cola» si no llega.
        </Alerta>
      ) : null}
      {estado === "error" ? (
        <Alerta tono="danger" titulo="No se pudo guardar la marca">
          No quedó en el teléfono. Vuelve a intentarlo.
        </Alerta>
      ) : null}
    </section>
  );
}
