"use client";

import { ScanFace } from "lucide-react";
import { useEffect, useState } from "react";

import { Alerta, Button, Campo, Checkbox, Input } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Previa = { proveedor: string };

/**
 * Prueba de vida con la cámara (D-03: obligatoria con el rostro). Con el proveedor simulado (pruebas y QA)
 * se elige el «rostro» que ve la cámara; el proveedor real necesita el widget de AWS Face Liveness, que aún
 * no está conectado: en ese caso se avisa y se usa el PIN. Entrega el identificador de la sesión ya completada.
 */
export function CapturaVida({
  portal,
  etiquetaAccion,
  onListo,
  deshabilitado = false,
}: {
  portal: string;
  etiquetaAccion: string;
  onListo: (sesionVidaId: string) => void | Promise<void>;
  deshabilitado?: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad(portal);
  const [proveedor, setProveedor] = useState<string | null>(null);
  const [rostro, setRostro] = useState("prueba");
  const [sinVida, setSinVida] = useState(false);

  useEffect(() => {
    let vivo = true;
    void ejecutar<Previa>("asistencia.biometria.iniciar_vida", {}, true, "ninguna").then((p) => vivo && p && setProveedor(p.proveedor));
    return () => {
      vivo = false;
    };
  }, [ejecutar]);

  async function iniciar() {
    const r = await ejecutar<{ sesionVidaId: string }>(
      "asistencia.biometria.iniciar_vida",
      proveedor === "simulado" ? { simulacion: { rostro, viva: !sinVida } } : {},
      false,
      "ninguna",
    );
    if (r?.sesionVidaId) await onListo(r.sesionVidaId);
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
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
      {proveedor === "simulado" ? (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border-control p-3">
          <span className="t-caption text-fg-muted">Proveedor simulado (solo pruebas): elige el rostro que «ve» la cámara.</span>
          <Campo etiqueta="Rostro de prueba" htmlFor="rostro-prueba">
            <Input id="rostro-prueba" value={rostro} onChange={(e) => setRostro(e.target.value)} maxLength={40} />
          </Campo>
          <Checkbox marcado={sinVida} onCambiar={setSinVida} etiqueta="Simular prueba de vida fallida" />
        </div>
      ) : null}
      <Button size="lg" block onClick={() => void iniciar()} disabled={deshabilitado || pendiente || !proveedor || proveedor === "rekognition"}>
        {pendiente ? "Verificando…" : etiquetaAccion}
      </Button>
    </div>
  );
}
