"use client";

import { Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { AvisoCodigoUnaVez, PanelCodigoUrl } from "./panel-codigo-url";
import { useCodigoQrDialog } from "./use-codigo-qr-dialog";

/** Genera o rota el enlace público `/marcar/[codigo]` y muestra el QR una sola vez. */
export function AccionesEnlaceMarcacion({ instalacionId }: { instalacionId: string }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const { codigo, svg, copiado, setCopiado, cerrar, mostrar, abierto } = useCodigoQrDialog(limpiarError);

  async function rotar() {
    const r = await ejecutar<{ codigo: string | null; url: string | null }>(
      "asistencia.marcas.enlace_publico_rotar",
      { instalacionId },
    );
    await mostrar(r?.codigo && r.url ? { codigo: r.codigo, url: r.url } : null);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => void rotar()} disabled={pendiente}>
        Enlace o QR para marcar
      </Button>
      {error && !abierto ? <span className="text-sm text-danger-fg">{error}</span> : null}
      <Dialog
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Enlace público de marcación"
        descripcion="Quien abre el enlace marca con su RUT y PIN. Al generar uno nuevo, el anterior deja de servir."
        acciones={<Button onClick={cerrar}>Listo</Button>}
      >
        {codigo ? (
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