"use client";

import { ScanFace } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Alerta, Button } from "@opai/ds";

import type { useEjecutorAsistencia } from "./use-ejecutor";

// Los controles del proveedor simulado (solo pruebas y QA) no pesan en el JS de la pantalla de producción.
const ControlesSimulado = dynamic(() => import("./controles-simulado").then((m) => m.ControlesSimulado));

type Ejecutor = ReturnType<typeof useEjecutorAsistencia>["ejecutar"];

/**
 * Captura del rostro con prueba de vida (D-03: obligatoria). Entrega la «muestra» que el núcleo envía al proveedor
 * y descarta: nunca se guarda una foto. Con el proveedor simulado (pruebas y QA) se elige el rostro que «ve» la
 * cámara. Con Rekognition la prueba de vida la completa el widget de AWS Face Liveness, que aún no está conectado
 * en el navegador: mientras tanto se avisa y la persona usa su PIN (denegación segura, sin simular nada).
 */
export function CapturaRostro({
  ejecutar, base, etiqueta, nombreSugerido, deshabilitado, onMuestra,
}: {
  ejecutar: Ejecutor;
  base: Record<string, unknown>;
  etiqueta: string;
  nombreSugerido: string;
  deshabilitado: boolean;
  onMuestra: (muestra: string) => void | Promise<void>;
}) {
  const [proveedor, setProveedor] = useState<string | null>(null);
  const [token, setToken] = useState(nombreSugerido);
  const [foto, setFoto] = useState(false);

  useEffect(() => {
    let vivo = true;
    void ejecutar<{ proveedor: string }>("asistencia.rostro.iniciar_vida", base, true).then((r) => vivo && r && setProveedor(r.proveedor));
    return () => {
      vivo = false;
    };
    // `base` cambia de identidad en cada render del padre; el proveedor no depende de él.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejecutar]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-lg border border-border-control bg-surface p-3">
        <span className="flex size-16 flex-none items-center justify-center rounded-full bg-fill" aria-hidden>
          <ScanFace className="size-8 text-fg-subtle" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="t-label text-fg">Prueba de vida</span>
          <span className="t-caption text-fg-muted">Mira a la cámara y gira la cabeza lentamente. No se guarda ninguna foto.</span>
        </div>
      </div>
      {proveedor === "rekognition" ? (
        <Alerta tono="warning" titulo="La cámara con prueba de vida aún no está conectada">
          Mientras tanto marca con tu RUT y PIN.
        </Alerta>
      ) : null}
      {proveedor === "simulado" ? <ControlesSimulado token={token} onToken={setToken} foto={foto} onFoto={setFoto} /> : null}
      <Button
        size="lg"
        block
        disabled={deshabilitado || proveedor !== "simulado" || token.length === 0}
        onClick={() => void onMuestra(`rostro:${token}${foto ? ":foto" : ""}`)}
      >
        {etiqueta}
      </Button>
    </div>
  );
}
