"use client";

import { useEffect, useRef, useState } from "react";

import { Alerta, Button } from "@opai/ds";

type Detector = { detect(fuente: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type ConstructorDetector = new (o: { formats: string[] }) => Detector;

/** El lector de códigos del propio navegador (Chrome/Android, Safari reciente); si no existe, se escribe el código. */
export function lectorDisponible(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices;
}

/**
 * Escaneo del QR con la cámara (CAR-78 · E3c). Todo ocurre en el teléfono: la imagen nunca se envía ni se guarda;
 * solo sale el texto del código. Al leer uno, apaga la cámara y lo entrega.
 */
export function EscanearQr({ alLeer }: { alLeer: (codigo: string) => void }) {
  const [activo, setActivo] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    let flujo: MediaStream | null = null;
    let reloj = 0;
    const Detector = (window as unknown as { BarcodeDetector: ConstructorDetector })
      .BarcodeDetector;
    const detector = new Detector({ formats: ["qr_code"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (f) => {
        if (!vivo) return f.getTracks().forEach((t) => t.stop());
        flujo = f;
        const v = video.current;
        if (!v) return;
        v.srcObject = f;
        await v.play();
        reloj = window.setInterval(() => {
          void detector
            .detect(v)
            .then((r) => {
              const valor = r[0]?.rawValue;
              if (valor && vivo) {
                vivo = false;
                setActivo(false);
                alLeer(valor);
              }
            })
            .catch(() => undefined);
        }, 300);
      })
      .catch(() => {
        setFalla("No se pudo abrir la cámara. Escribe el código del punto.");
        setActivo(false);
      });
    return () => {
      vivo = false;
      window.clearInterval(reloj);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [activo, alLeer]);

  return (
    <div className="flex flex-col gap-2">
      {activo ? (
        <>
          <video
            ref={video}
            muted
            playsInline
            className="aspect-square w-full rounded-lg bg-surface-muted object-cover"
          />
          <Button variant="secondary" onClick={() => setActivo(false)}>
            Cancelar
          </Button>
        </>
      ) : (
        <Button
          variant="secondary"
          onClick={() => {
            setFalla(null);
            setActivo(true);
          }}
        >
          Escanear con la cámara
        </Button>
      )}
      {falla ? (
        <Alerta tono="warning" titulo="Cámara no disponible">
          {falla}
        </Alerta>
      ) : null}
    </div>
  );
}
