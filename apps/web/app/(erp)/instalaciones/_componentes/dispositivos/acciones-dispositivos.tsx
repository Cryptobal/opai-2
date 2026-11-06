"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Button, CodigoQr, Dialog } from "@opai/ds";

import { qrDeEmparejamiento } from "@/app/_acciones/dispositivos";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Codigo = { codigo: string | null; venceEn: string | null; url: string | null };

/** «Emparejar dispositivo»: genera el código, lo muestra una vez con su QR y el plazo de 10 minutos. */
export function AccionesDispositivos({ instalacionId }: { instalacionId: string }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [codigo, setCodigo] = useState<Codigo | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function generar() {
    const r = await ejecutar<Codigo>("core.dispositivos.generar_codigo", { instalacionId });
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
      <Button onClick={() => void generar()} disabled={pendiente}>
        Emparejar dispositivo
      </Button>
      {error && !codigo ? <span className="text-sm text-danger-fg">{error}</span> : null}
      <Dialog
        abierto={codigo !== null}
        onCerrar={cerrar}
        titulo="Emparejar dispositivo"
        descripcion="En el equipo de terreno abre Terreno → Emparejar y escribe el código o escanea el QR."
        acciones={<Button onClick={cerrar}>Listo</Button>}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full items-center gap-2">
            <p className="t-mono flex min-h-14 flex-1 items-center justify-center rounded-md border border-border bg-bg text-3xl tracking-[0.3em] text-fg">
              {codigo?.codigo}
            </p>
            <Button
              variant="secondary"
              onClick={() =>
                void navigator.clipboard
                  .writeText(codigo?.codigo ?? "")
                  .then(() => setCopiado(true))
              }
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>
          {svg ? <CodigoQr svg={svg} /> : null}
          <Alerta
            tono="info"
            titulo="Vence en 10 minutos y sirve una sola vez. No se vuelve a mostrar."
          />
        </div>
      </Dialog>
    </>
  );
}

/** Revocar corta el acceso al instante: confirmación antes de actuar. */
export function BotonRevocar({
  dispositivoId,
  identificador,
}: {
  dispositivoId: string;
  identificador: string;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  async function revocar() {
    const r = await ejecutar("core.dispositivos.revocar", { dispositivoId });
    if (!r) return;
    avisar.exito(`${identificador} revocado`);
    setAbierto(false);
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Revocar
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => {
          setAbierto(false);
          limpiarError();
        }}
        titulo={`Revocar ${identificador}`}
        descripcion="El equipo deja de mostrar datos en su siguiente petición, muestra «Este dispositivo ya no está emparejado» y borra los datos de la instalación. Para usarlo de nuevo hay que emparejarlo otra vez."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void revocar()} disabled={pendiente}>
              Revocar dispositivo
            </Button>
          </>
        }
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </Dialog>
    </>
  );
}
