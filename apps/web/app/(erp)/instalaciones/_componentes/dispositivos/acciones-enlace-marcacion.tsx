"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Alerta, Button, CodigoQr, Dialog } from "@opai/ds";

import { qrDeEmparejamiento } from "@/app/_acciones/dispositivos";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Codigo = { codigo: string | null; url: string | null };

/** Genera o rota el enlace público `/marcar/[codigo]` (CAR-606) y muestra el QR una sola vez. */
export function AccionesEnlaceMarcacion({ instalacionId }: { instalacionId: string }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [codigo, setCodigo] = useState<Codigo | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function rotar() {
    const r = await ejecutar<Codigo>("asistencia.marcas.enlace_publico_rotar", { instalacionId });
    if (!r?.codigo || !r.url) return;
    setCodigo(r);
    setSvg(await qrDeEmparejamiento(r.url));
  }

  const cerrar = () => {
    setCodigo(null);
    setSvg(null);
    setCopiado(false);
    limpiarError();
  };

  return (
    <>
      <Button variant="secondary" onClick={() => void rotar()} disabled={pendiente}>
        Enlace o QR para marcar
      </Button>
      {error && !codigo ? <span className="text-sm text-danger-fg">{error}</span> : null}
      <Dialog
        abierto={codigo !== null}
        onCerrar={cerrar}
        titulo="Enlace público de marcación"
        descripcion="Quien abre el enlace marca con su RUT y PIN. Al generar uno nuevo, el anterior deja de servir."
        acciones={<Button onClick={cerrar}>Listo</Button>}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full items-center gap-2">
            <p className="t-mono flex min-h-14 flex-1 items-center justify-center rounded-md border border-border bg-bg text-2xl tracking-[0.2em] text-fg">
              {codigo?.codigo}
            </p>
            <Button
              variant="secondary"
              onClick={() =>
                void navigator.clipboard.writeText(codigo?.url ?? "").then(() => setCopiado(true))
              }
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? "Copiado" : "Copiar URL"}
            </Button>
          </div>
          {svg ? <CodigoQr svg={svg} /> : null}
          <Alerta tono="info" titulo="El código no se vuelve a mostrar. Guárdalo o imprime el QR." />
        </div>
      </Dialog>
    </>
  );
}