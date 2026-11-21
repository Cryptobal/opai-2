"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { PanelCodigoUrl } from "./panel-codigo-url";
import { useCodigoQrDialog } from "./use-codigo-qr-dialog";

type Codigo = { codigo: string | null; venceEn: string | null; url: string | null };

/** «Emparejar dispositivo»: genera el código, lo muestra una vez con su QR y el plazo de 10 minutos. */
export function AccionesDispositivos({ instalacionId }: { instalacionId: string }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const { codigo, svg, copiado, setCopiado, cerrar, mostrar, abierto } = useCodigoQrDialog(limpiarError);

  async function generar() {
    const r = await ejecutar<Codigo>("core.dispositivos.generar_codigo", { instalacionId });
    await mostrar(r?.codigo && r.url ? { codigo: r.codigo, url: r.url } : null);
  }
  return (
    <>
      <Button onClick={() => void generar()} disabled={pendiente}>
        Emparejar dispositivo
      </Button>
      {error && !abierto ? <span className="text-sm text-danger-fg">{error}</span> : null}
      <Dialog
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Emparejar dispositivo"
        descripcion="En el equipo de terreno abre Terreno → Emparejar y escribe el código o escanea el QR."
        acciones={<Button onClick={cerrar}>Listo</Button>}
      >
        {codigo ? (
          <>
            <PanelCodigoUrl
              codigo={codigo.codigo}
              url={codigo.codigo}
              svg={svg}
              copiado={copiado}
              onCopiado={() => setCopiado(true)}
              tamanoTexto="text-3xl"
              espaciado="tracking-[0.3em]"
              etiquetaCopiar="Copiar"
            />
            <Alerta
              tono="info"
              titulo="Vence en 10 minutos y sirve una sola vez. No se vuelve a mostrar."
            />
          </>
        ) : null}
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
