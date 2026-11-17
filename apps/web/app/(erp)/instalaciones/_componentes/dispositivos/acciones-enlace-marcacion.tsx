"use client";

import { useState } from "react";

import { Button, Dialog } from "@opai/ds";

import { qrDeEmparejamiento } from "@/app/_acciones/dispositivos";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { AvisoCodigoUnaVez, PanelCodigoUrl } from "./panel-codigo-url";

type Codigo = { codigo: string | null; url: string | null };

/** Genera o rota el enlace público `/marcar/[codigo]` y muestra el QR una sola vez. */
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
        {codigo?.codigo && codigo.url ? (
          <>
            <PanelCodigoUrl
              codigo={codigo.codigo}
              url={codigo.url}
              svg={svg}
              copiado={copiado}
              onCopiado={() => setCopiado(true)}
            />
            <AvisoCodigoUnaVez />
          </>
        ) : null}
      </Dialog>
    </>
  );
}