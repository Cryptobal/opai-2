"use client";

import { Check, Copy } from "lucide-react";

import { Alerta, Button, CodigoQr } from "@opai/ds";

export function PanelCodigoUrl({
  codigo,
  url,
  svg,
  copiado,
  onCopiado,
  tamanoTexto = "text-2xl",
  espaciado = "tracking-[0.2em]",
  etiquetaCopiar = "Copiar URL",
}: {
  codigo: string;
  url: string;
  svg: string | null;
  copiado: boolean;
  onCopiado: () => void;
  tamanoTexto?: string;
  espaciado?: string;
  etiquetaCopiar?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center gap-2">
        <p
          className={`t-mono flex min-h-14 flex-1 items-center justify-center rounded-md border border-border bg-bg ${tamanoTexto} ${espaciado} text-fg`}
        >
          {codigo}
        </p>
        <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(url).then(onCopiado)}>
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiado ? "Copiado" : etiquetaCopiar}
        </Button>
      </div>
      {svg ? <CodigoQr svg={svg} /> : null}
    </div>
  );
}

export function AvisoCodigoUnaVez() {
  return <Alerta tono="info" titulo="El código no se vuelve a mostrar. Guárdalo o imprime el QR." />;
}