import { PaginaConfig } from "@/app/(erp)/configuracion/_centro/pagina-config";

import { cargarConfigDte } from "./_componentes/datos";
import { PantallaConfigDte } from "./_componentes/pantalla-config-dte";

export const metadata = { title: "Facturación electrónica" };

/** Parámetros DTE del tenant (CAR-154): ambiente, SimpleAPI y resolución SII. */
export default function ConfiguracionDtePage() {
  return (
    <PaginaConfig
      seccion="facturacion-electronica"
      titulo="Facturación electrónica"
      cargar={() => cargarConfigDte()}
      cabecera={() => ({
        subtitulo:
          "Ambiente SII, conector de emisión y resolución del emisor. Las credenciales SimpleAPI y el certificado se cargan en Configuración › Integraciones.",
      })}
    >
      {(d) => <PantallaConfigDte state={d.state} cfg={d.cfg} esOwner={d.esOwner} />}
    </PaginaConfig>
  );
}
